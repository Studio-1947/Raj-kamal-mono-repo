/**
 * Pending-order analysis for the Website Orders page.
 *
 * "Pending" is four different upstream statuses and, on its own, says nothing about
 * whether an order is genuinely waiting on us, was abandoned at checkout, or has
 * already shipped while its status lagged behind. This module answers three things:
 *
 *   1. Which pending orders are REAL, and which are not (verdicts below).
 *   2. Where the genuine ones are stuck (idle time against a per-stage SLA).
 *   3. How orders convert as they move down the pipeline (funnel + cohorts).
 *
 * Limits worth knowing: the upstream exposes only an order's CURRENT status, not a
 * transition log. "Moving forward" is therefore inferred from current state — the
 * funnel (how far orders have got), cohorts (how much of each age group has since
 * completed), `updatedAt` (last touched) and shipment timestamps. Exact stage-to-stage
 * timings would need us to snapshot statuses over time.
 */

import {
  scanOrders,
  type OrderFilters,
  type ScanProgress,
  type WebsiteOrder,
} from "./websiteOrdersService.js";

/** Same ceiling as the KPI summary: the upstream has no totals endpoint, so we page. */
const ANALYSIS_MAX_ORDERS = 3000;

/** Cap on rows returned for the drill-down list — the page can't usefully show more. */
const MAX_FLAGGED_ROWS = 300;

/** Happy-path order of the fulfilment pipeline. */
export const PIPELINE = [
  "PENDING",
  "PENDING_INVOICE",
  "PENDING_LABEL",
  "PENDING_DISPATCH",
  "COMPLETED",
] as const;

export const PENDING_STAGES = PIPELINE.slice(0, 4) as unknown as readonly PendingStage[];
export type PendingStage = "PENDING" | "PENDING_INVOICE" | "PENDING_LABEL" | "PENDING_DISPATCH";

/**
 * How long an order may sit untouched in a stage before we call it stuck. These are
 * working assumptions, not upstream facts — tune them to the team's real turnaround.
 */
export const STAGE_SLA_HOURS: Record<PendingStage, number> = {
  PENDING: 24,
  PENDING_INVOICE: 48,
  PENDING_LABEL: 48,
  PENDING_DISPATCH: 72,
};

/** An online payment still unconfirmed after this long is a dead checkout, not a wait. */
const PAYMENT_GRACE_HOURS = 24;

export type Verdict = "ON_TRACK" | "STUCK" | "STATUS_LAGGING" | "NOT_REALLY_PENDING";

export type VerdictReason =
  | "AWAITING_PAYMENT" // online payment initiated recently — give it time
  | "IDLE_PAST_SLA" // genuine order, untouched longer than the stage allows
  | "ALREADY_SHIPPED" // a shipment exists with a ship date / tracking number
  | "ALREADY_DELIVERED" // shipment is delivered but order isn't marked completed
  | "PAYMENT_FAILED"
  | "PAYMENT_ABANDONED" // online payment never captured, past the grace window
  | "REFUNDED_STILL_OPEN"; // money returned but order never cancelled/closed

export type PendingClassification = {
  verdict: Verdict;
  reasons: VerdictReason[];
  ageHours: number;
  /** Hours since the order was last updated upstream — our "is it moving?" signal. */
  idleHours: number;
};

export type FlaggedOrder = PendingClassification & { order: WebsiteOrder };

export type StageRow = {
  stage: PendingStage;
  count: number;
  revenue: number;
  byVerdict: Record<Verdict, number>;
  medianIdleHours: number;
  maxIdleHours: number;
  slaHours: number;
};

export type FunnelStep = {
  stage: (typeof PIPELINE)[number];
  /** Non-cancelled orders that are at this stage or further along. */
  reached: number;
  /** reached / previous step's reached; null for the first step. */
  stepConversion: number | null;
  /** reached / orders placed. */
  ofPlaced: number;
};

export type CohortRow = {
  label: string;
  placed: number;
  completed: number;
  stillPending: number;
  cancelled: number;
  completedPct: number;
  stillPendingPct: number;
};

export type PendingAnalysis = {
  placed: number;
  pendingCount: number;
  pendingRevenue: number;
  verdicts: Record<Verdict, { count: number; revenue: number }>;
  /** Count by reason, so "why is it not real" is answerable, not just "how many". */
  reasons: Partial<Record<VerdictReason, number>>;
  stages: StageRow[];
  funnel: FunnelStep[];
  cancelled: number;
  completed: number;
  /** completed / placed — every order counts against us, including dead checkouts. */
  rawConversion: number;
  /**
   * completed / (placed − cancelled − NOT_REALLY_PENDING): the rate among orders that
   * were ever real. This is the number to judge fulfilment by.
   */
  realConversion: number;
  cohorts: CohortRow[];
  velocity: {
    medianHoursToShip: number | null;
    medianHoursToDeliver: number | null;
    shippedSample: number;
    deliveredSample: number;
  };
  slaHours: Record<PendingStage, number>;
  flagged: FlaggedOrder[];
  flaggedTruncated: boolean;
  truncated: boolean;
  scannedOrders: number;
  coveredFrom: string | null;
};

const HOUR_MS = 3_600_000;

function isPendingStage(status: string): status is PendingStage {
  return (PENDING_STAGES as readonly string[]).includes(status);
}

function hoursSince(iso: string | null, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, (now - t) / HOUR_MS) : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? Number((part / whole).toFixed(4)) : 0;
}

/**
 * Decide whether one order in a pending status is really pending. Rules apply top to
 * bottom and the first match wins, so a shipped order is never also called abandoned.
 * Pure and exported so the rules can be tested without the upstream.
 */
export function classifyPendingOrder(order: WebsiteOrder, now = Date.now()): PendingClassification {
  const ageHours = hoursSince(order.placedAt, now);
  // Never touched since placement → idle for its whole life.
  const idleHours = hoursSince(order.updatedAt ?? order.placedAt, now);
  const stage = order.status as PendingStage;
  const base = { ageHours: round1(ageHours), idleHours: round1(idleHours) };

  const shipment = order.shipment;
  if (shipment?.deliveredAt || shipment?.status?.toUpperCase() === "DELIVERED") {
    return { verdict: "STATUS_LAGGING", reasons: ["ALREADY_DELIVERED"], ...base };
  }
  if (shipment?.shippedAt || shipment?.trackingNumber) {
    return { verdict: "STATUS_LAGGING", reasons: ["ALREADY_SHIPPED"], ...base };
  }

  if (order.paymentStatus === "REFUNDED") {
    return { verdict: "NOT_REALLY_PENDING", reasons: ["REFUNDED_STILL_OPEN"], ...base };
  }
  if (order.paymentStatus === "FAILED") {
    return { verdict: "NOT_REALLY_PENDING", reasons: ["PAYMENT_FAILED"], ...base };
  }

  // COD is expected to be payment-pending until delivery, so only online methods can
  // be "abandoned". An unrecorded method is left alone rather than guessed at.
  const isOnline = order.paymentMethod !== null && order.paymentMethod !== "CASH_ON_DELIVERY";
  if (stage === "PENDING" && isOnline && order.paymentStatus === "PENDING") {
    return ageHours > PAYMENT_GRACE_HOURS
      ? { verdict: "NOT_REALLY_PENDING", reasons: ["PAYMENT_ABANDONED"], ...base }
      : { verdict: "ON_TRACK", reasons: ["AWAITING_PAYMENT"], ...base };
  }

  if (idleHours > STAGE_SLA_HOURS[stage]) {
    return { verdict: "STUCK", reasons: ["IDLE_PAST_SLA"], ...base };
  }
  return { verdict: "ON_TRACK", reasons: [], ...base };
}

const VERDICT_PRIORITY: Record<Verdict, number> = {
  STUCK: 0,
  STATUS_LAGGING: 1,
  NOT_REALLY_PENDING: 2,
  ON_TRACK: 3,
};

const COHORT_BUCKETS = [
  { label: "Today", maxDays: 1 },
  { label: "1–3 days", maxDays: 3 },
  { label: "3–7 days", maxDays: 7 },
  { label: "7–14 days", maxDays: 14 },
  { label: "14–30 days", maxDays: 30 },
  { label: "30+ days", maxDays: Infinity },
] as const;

export async function fetchPendingAnalysis(filters: OrderFilters): Promise<PendingAnalysis> {
  // Status and payment filters are deliberately dropped: the funnel needs every status
  // to know what pending orders converted into, whatever the table is filtered to.
  const scope: OrderFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    channel: filters.channel,
  };

  const now = Date.now();
  const progress: ScanProgress = { scanned: 0, truncated: false };

  const emptyVerdicts = (): Record<Verdict, number> => ({
    ON_TRACK: 0,
    STUCK: 0,
    STATUS_LAGGING: 0,
    NOT_REALLY_PENDING: 0,
  });

  const verdicts: PendingAnalysis["verdicts"] = {
    ON_TRACK: { count: 0, revenue: 0 },
    STUCK: { count: 0, revenue: 0 },
    STATUS_LAGGING: { count: 0, revenue: 0 },
    NOT_REALLY_PENDING: { count: 0, revenue: 0 },
  };
  const reasons: PendingAnalysis["reasons"] = {};
  const stageAcc = new Map<
    PendingStage,
    { count: number; revenue: number; byVerdict: Record<Verdict, number>; idle: number[] }
  >(PENDING_STAGES.map((s) => [s, { count: 0, revenue: 0, byVerdict: emptyVerdicts(), idle: [] }]));
  const cohortAcc = COHORT_BUCKETS.map(() => ({
    placed: 0,
    completed: 0,
    stillPending: 0,
    cancelled: 0,
  }));
  const rankCounts = PIPELINE.map(() => 0);
  const flagged: FlaggedOrder[] = [];
  const toShip: number[] = [];
  const toDeliver: number[] = [];

  let placed = 0;
  let cancelled = 0;
  let completed = 0;
  let pendingRevenue = 0;
  let earliestPlacedAt: string | null = null;

  for await (const order of scanOrders(scope, ANALYSIS_MAX_ORDERS, progress)) {
    placed += 1;
    if (order.placedAt && (!earliestPlacedAt || order.placedAt < earliestPlacedAt)) {
      earliestPlacedAt = order.placedAt;
    }

    const ageDays = hoursSince(order.placedAt, now) / 24;
    const cohort = cohortAcc[COHORT_BUCKETS.findIndex((b) => ageDays < b.maxDays)]!;
    cohort.placed += 1;

    if (order.status === "CANCELLED") {
      cancelled += 1;
      cohort.cancelled += 1;
      continue;
    }

    const rank = (PIPELINE as readonly string[]).indexOf(order.status);
    if (rank >= 0) rankCounts[rank]! += 1;

    if (order.shipment?.shippedAt && order.placedAt) {
      const h =
        (new Date(order.shipment.shippedAt).getTime() - new Date(order.placedAt).getTime()) /
        HOUR_MS;
      if (Number.isFinite(h) && h >= 0) toShip.push(h);
    }
    if (order.shipment?.deliveredAt && order.placedAt) {
      const h =
        (new Date(order.shipment.deliveredAt).getTime() - new Date(order.placedAt).getTime()) /
        HOUR_MS;
      if (Number.isFinite(h) && h >= 0) toDeliver.push(h);
    }

    if (order.status === "COMPLETED") {
      completed += 1;
      cohort.completed += 1;
      continue;
    }

    if (!isPendingStage(order.status)) continue;

    cohort.stillPending += 1;
    const result = classifyPendingOrder(order, now);
    const revenue = order.amounts.grandTotal;

    pendingRevenue += revenue;
    verdicts[result.verdict].count += 1;
    verdicts[result.verdict].revenue += revenue;
    for (const reason of result.reasons) reasons[reason] = (reasons[reason] ?? 0) + 1;

    const stage = stageAcc.get(order.status)!;
    stage.count += 1;
    stage.revenue += revenue;
    stage.byVerdict[result.verdict] += 1;
    stage.idle.push(result.idleHours);

    flagged.push({ ...result, order });
  }

  flagged.sort(
    (a, b) =>
      VERDICT_PRIORITY[a.verdict] - VERDICT_PRIORITY[b.verdict] || b.idleHours - a.idleHours,
  );

  const notReal = verdicts.NOT_REALLY_PENDING.count;
  const pendingCount = flagged.length;

  // `reached[i]` = orders at stage i or beyond. Cancelled orders are excluded: they left
  // the pipeline, they didn't convert or stall.
  const funnel: FunnelStep[] = PIPELINE.map((stage, i) => {
    const reached = rankCounts.slice(i).reduce((sum, n) => sum + n, 0);
    const prev = i === 0 ? null : rankCounts.slice(i - 1).reduce((sum, n) => sum + n, 0);
    return {
      stage,
      reached,
      stepConversion: prev === null ? null : ratio(reached, prev),
      ofPlaced: ratio(reached, placed),
    };
  });

  return {
    placed,
    pendingCount,
    pendingRevenue: round2(pendingRevenue),
    verdicts: Object.fromEntries(
      Object.entries(verdicts).map(([k, v]) => [k, { count: v.count, revenue: round2(v.revenue) }]),
    ) as PendingAnalysis["verdicts"],
    reasons,
    stages: PENDING_STAGES.map((stage) => {
      const acc = stageAcc.get(stage)!;
      return {
        stage,
        count: acc.count,
        revenue: round2(acc.revenue),
        byVerdict: acc.byVerdict,
        medianIdleHours: round1(median(acc.idle)),
        maxIdleHours: round1(acc.idle.length ? Math.max(...acc.idle) : 0),
        slaHours: STAGE_SLA_HOURS[stage],
      };
    }),
    funnel,
    cancelled,
    completed,
    rawConversion: ratio(completed, placed),
    realConversion: ratio(completed, placed - cancelled - notReal),
    cohorts: COHORT_BUCKETS.map((bucket, i) => {
      const acc = cohortAcc[i]!;
      return {
        label: bucket.label,
        ...acc,
        completedPct: ratio(acc.completed, acc.placed),
        stillPendingPct: ratio(acc.stillPending, acc.placed),
      };
    }),
    velocity: {
      medianHoursToShip: toShip.length ? round1(median(toShip)) : null,
      medianHoursToDeliver: toDeliver.length ? round1(median(toDeliver)) : null,
      shippedSample: toShip.length,
      deliveredSample: toDeliver.length,
    },
    slaHours: STAGE_SLA_HOURS,
    flagged: flagged.slice(0, MAX_FLAGGED_ROWS),
    flaggedTruncated: pendingCount > MAX_FLAGGED_ROWS,
    truncated: progress.truncated,
    scannedOrders: progress.scanned,
    coveredFrom: earliestPlacedAt,
  };
}
