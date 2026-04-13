
const baseUrl = 'http://localhost:4000/api/offline-sales/summary?days=90';

async function test() {
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();
    console.log('Keys in response:');
    Object.keys(data).forEach(k => console.log(' - ' + k));
    if (data.revenueByBinding) {
      console.log('Revenue by Binding sample:', data.revenueByBinding.slice(0, 3));
    } else {
      console.log('revenueByBinding is MISSING');
    }
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}

test();
