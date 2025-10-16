import { prisma } from '../src/lib/prisma.js';

// Helper to convert BigInt to string for JSON serialization
function stringifyWithBigInt(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2
  );
}

async function checkSalesData() {
  console.log('\n=== Checking Sales Data ===\n');

  // Check Online Sales
  const onlineCount = await prisma.onlineSale.count();
  console.log('📊 OnlineSale count:', onlineCount);
  if (onlineCount > 0) {
    const onlineSample = await prisma.onlineSale.findFirst({
      select: { id: true, date: true, month: true, year: true, amount: true, title: true, rawJson: true }
    });
    console.log('Sample OnlineSale:', stringifyWithBigInt(onlineSample));
  }

  // Check Offline Sales
  const offlineCount = await prisma.offlineCashUPICCSale.count();
  console.log('\n📊 OfflineCashUPICCSale count:', offlineCount);
  if (offlineCount > 0) {
    const offlineSample = await prisma.offlineCashUPICCSale.findFirst({
      select: { id: true, date: true, month: true, year: true, amount: true, title: true, rawJson: true }
    });
    console.log('Sample OfflineCashUPICCSale:', stringifyWithBigInt(offlineSample));
    
    const offlineSamples = await prisma.offlineCashUPICCSale.findMany({
      take: 3,
      select: { id: true, date: true, month: true, year: true, amount: true, qty: true, rate: true, title: true, rawJson: true }
    });
    console.log('\nFirst 3 OfflineCashUPICCSale records:');
    offlineSamples.forEach((record, idx) => {
      console.log(`\n--- Record ${idx + 1} ---`);
      console.log('ID:', record.id?.toString());
      console.log('Date:', record.date);
      console.log('Month:', record.month);
      console.log('Year:', record.year);
      console.log('Amount:', record.amount);
      console.log('Qty:', record.qty);
      console.log('Rate:', record.rate);
      console.log('Title:', record.title);
      if (record.rawJson) {
        console.log('RawJson keys:', Object.keys(record.rawJson as any));
        console.log('RawJson:', stringifyWithBigInt(record.rawJson).substring(0, 500));
      }
    });
  }

  // Check Lok Event Sales
  const lokCount = await prisma.lokEventSale.count();
  console.log('\n📊 LokEventSale count:', lokCount);
  if (lokCount > 0) {
    const lokSample = await prisma.lokEventSale.findFirst({
      select: { id: true, date: true, month: true, year: true, amount: true, title: true, rawJson: true }
    });
    console.log('Sample LokEventSale:', stringifyWithBigInt(lokSample));
    
    // Get a few more to analyze the structure
    const lokSamples = await prisma.lokEventSale.findMany({
      take: 5,
      select: { id: true, date: true, month: true, year: true, amount: true, qty: true, rate: true, title: true, customerName: true, email: true, mobile: true, rawJson: true }
    });
    console.log('\nFirst 5 LokEventSale records:');
    lokSamples.forEach((record, idx) => {
      console.log(`\n--- Record ${idx + 1} ---`);
      console.log('ID:', record.id?.toString());
      console.log('Date:', record.date);
      console.log('Month:', record.month);
      console.log('Year:', record.year);
      console.log('Amount:', record.amount);
      console.log('Qty:', record.qty);
      console.log('Rate:', record.rate);
      console.log('Title:', record.title);
      console.log('Customer:', record.customerName);
      console.log('Email:', record.email);
      console.log('Mobile:', record.mobile);
      if (record.rawJson) {
        console.log('RawJson keys:', Object.keys(record.rawJson as any));
        console.log('RawJson:', stringifyWithBigInt(record.rawJson).substring(0, 500));
      } else {
        console.log('RawJson: null');
      }
    });
  } else {
    console.log('⚠️  No LokEventSale records found!');
  }

  // Check RajRadha Event Sales
  const rajradhaCount = await prisma.rajRadhaEventSale.count();
  console.log('\n📊 RajRadhaEventSale count:', rajradhaCount);
  if (rajradhaCount > 0) {
    const rajradhaSample = await prisma.rajRadhaEventSale.findFirst({
      select: { id: true, date: true, month: true, year: true, amount: true, title: true, rawJson: true }
    });
    console.log('Sample RajRadhaEventSale:', stringifyWithBigInt(rajradhaSample));
    
    // Get a few more to analyze the structure
    const rajradhaSamples = await prisma.rajRadhaEventSale.findMany({
      take: 5,
      select: { id: true, date: true, month: true, year: true, amount: true, qty: true, rate: true, title: true, customerName: true, email: true, mobile: true, rawJson: true }
    });
    console.log('\nFirst 5 RajRadhaEventSale records:');
    rajradhaSamples.forEach((record, idx) => {
      console.log(`\n--- Record ${idx + 1} ---`);
      console.log('ID:', record.id?.toString());
      console.log('Date:', record.date);
      console.log('Month:', record.month);
      console.log('Year:', record.year);
      console.log('Amount:', record.amount);
      console.log('Qty:', record.qty);
      console.log('Rate:', record.rate);
      console.log('Title:', record.title);
      console.log('Customer:', record.customerName);
      console.log('Email:', record.email);
      console.log('Mobile:', record.mobile);
      if (record.rawJson) {
        console.log('RawJson keys:', Object.keys(record.rawJson as any));
        console.log('RawJson:', stringifyWithBigInt(record.rawJson).substring(0, 500));
      } else {
        console.log('RawJson: null');
      }
    });
  } else {
    console.log('⚠️  No RajRadhaEventSale records found!');
  }

  console.log('\n=== Done ===\n');
  await prisma.$disconnect();
}

checkSalesData().catch(console.error);
