import fetch from 'node-fetch';

async function fetchSheetByGid(gid: string) {
  const URL = `https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=${gid}`;
  console.log(`Fetching sheet with GID ${gid}...`);
  const res = await fetch(URL);
  if (!res.ok) {
    console.error(`Fetch failed for GID ${gid}:`, res.statusText);
    return;
  }
  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  console.log(`Successfully fetched GID ${gid}! Total rows in CSV: ${lines.length}`);
  if (lines.length > 0) {
    console.log("Header line:", lines[0]);
    console.log("Sample line 1:", lines[1] || "(None)");
    console.log("Sample line 2:", lines[2] || "(None)");
  }
}

async function run() {
  await fetchSheetByGid("428885829"); // Lokbharti
  await fetchSheetByGid("541252527"); // Online
  await fetchSheetByGid("750818183"); // BookFair
}

run().catch(console.error);
