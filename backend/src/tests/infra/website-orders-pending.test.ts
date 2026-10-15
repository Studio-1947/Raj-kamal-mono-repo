import { describe, it, expect } from 'vitest';
import { classifyPendingOrder } from '../../services/websiteOrdersPending.js';
import type { WebsiteOrder } from '../../services/websiteOrdersService.js';

const NOW = new Date('2026-10-15T12:00:00.000Z').getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function makeOrder(overrides: Partial<WebsiteOrder> = {}): WebsiteOrder {
  return {
    id: 'o1',
    orderNumber: 'RK-1',
    placedAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
    status: 'PENDING_INVOICE',
    paymentStatus: 'CAPTURED',
    paymentMethod: 'RAZORPAY',
    channel: 'ONLINE',
    currency: 'INR',
    customer: { name: 'A', email: null, phone: null, group: null },
    shipTo: { city: null, state: null, postalCode: null, country: null },
    amounts: { subtotal: 100, discount: 0, tax: 0, shipping: 0, codFee: 0, grandTotal: 100 },
    itemCount: 1,
    totalQuantity: 1,
    items: [],
    shipment: null,
    tags: [],
    isSplitOrder: false,
    ...overrides,
  };
}

describe('classifyPendingOrder', () => {
  it('treats a recent, paid order as on track', () => {
    expect(classifyPendingOrder(makeOrder(), NOW).verdict).toBe('ON_TRACK');
  });

  it('flags an order idle past the stage SLA as stuck', () => {
    const order = makeOrder({ status: 'PENDING_LABEL', updatedAt: hoursAgo(60) });
    const result = classifyPendingOrder(order, NOW);
    expect(result.verdict).toBe('STUCK');
    expect(result.reasons).toEqual(['IDLE_PAST_SLA']);
  });

  it('uses idle time, not age: an old order touched recently is not stuck', () => {
    const order = makeOrder({ placedAt: hoursAgo(400), updatedAt: hoursAgo(2) });
    expect(classifyPendingOrder(order, NOW).verdict).toBe('ON_TRACK');
  });

  it('calls an online payment still pending after the grace window abandoned', () => {
    const order = makeOrder({
      status: 'PENDING',
      paymentStatus: 'PENDING',
      placedAt: hoursAgo(30),
      updatedAt: hoursAgo(30),
    });
    const result = classifyPendingOrder(order, NOW);
    expect(result.verdict).toBe('NOT_REALLY_PENDING');
    expect(result.reasons).toEqual(['PAYMENT_ABANDONED']);
  });

  it('gives a fresh online payment time to complete', () => {
    const order = makeOrder({ status: 'PENDING', paymentStatus: 'PENDING' });
    const result = classifyPendingOrder(order, NOW);
    expect(result.verdict).toBe('ON_TRACK');
    expect(result.reasons).toEqual(['AWAITING_PAYMENT']);
  });

  it('never calls COD abandoned just because payment is pending', () => {
    const order = makeOrder({
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      placedAt: hoursAgo(30),
      updatedAt: hoursAgo(10),
    });
    expect(classifyPendingOrder(order, NOW).verdict).toBe('ON_TRACK');
  });

  it('does not guess when the payment method is unrecorded', () => {
    const order = makeOrder({
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: null,
      placedAt: hoursAgo(30),
      updatedAt: hoursAgo(10),
    });
    expect(classifyPendingOrder(order, NOW).verdict).toBe('ON_TRACK');
  });

  it('flags failed and refunded payments as not really pending', () => {
    expect(classifyPendingOrder(makeOrder({ paymentStatus: 'FAILED' }), NOW).reasons).toEqual([
      'PAYMENT_FAILED',
    ]);
    expect(classifyPendingOrder(makeOrder({ paymentStatus: 'REFUNDED' }), NOW).reasons).toEqual([
      'REFUNDED_STILL_OPEN',
    ]);
  });

  it('detects orders that already shipped while the status lagged', () => {
    const shipped = makeOrder({
      shipment: { carrier: 'X', trackingNumber: 'T1', status: 'IN_TRANSIT', shippedAt: hoursAgo(3), deliveredAt: null },
    });
    expect(classifyPendingOrder(shipped, NOW)).toMatchObject({
      verdict: 'STATUS_LAGGING',
      reasons: ['ALREADY_SHIPPED'],
    });

    const delivered = makeOrder({
      shipment: { carrier: 'X', trackingNumber: 'T1', status: 'DELIVERED', shippedAt: hoursAgo(50), deliveredAt: hoursAgo(1) },
    });
    expect(classifyPendingOrder(delivered, NOW).reasons).toEqual(['ALREADY_DELIVERED']);
  });

  it('lets shipment evidence win over a failed payment', () => {
    const order = makeOrder({
      paymentStatus: 'FAILED',
      shipment: { carrier: 'X', trackingNumber: 'T1', status: null, shippedAt: null, deliveredAt: null },
    });
    expect(classifyPendingOrder(order, NOW).verdict).toBe('STATUS_LAGGING');
  });
});
