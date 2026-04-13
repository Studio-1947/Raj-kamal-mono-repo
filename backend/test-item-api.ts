
const baseUrl = 'http://localhost:4000/api/offline-sales/summary?days=90';

async function test() {
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();
    const raj = data.topItems.find(i => i.title.includes('RAJKAMAL CHOUDHARY RACHANAWALI'));
    console.log('Target Book Data:', raj);
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}

test();
