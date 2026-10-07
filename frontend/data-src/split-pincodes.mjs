// Splits data-src/india_states_pincodes.svg into public/data/pincodes/<STATE>.json. Run from frontend/: node data-src/split-pincodes.mjs
import fs from 'fs';
const src = fs.readFileSync('data-src/india_states_pincodes.svg','utf8');
const codes = {"Andaman & Nicobar":"AN","Andhra Pradesh":"AP","Arunachal Pradesh":"AR","Assam":"AS","Bihar":"BR","Chandigarh":"CH","Chhattisgarh":"CG","Dadra & Nagar Haveli & Daman & Diu":"DD","Delhi":"DL","Goa":"GA","Gujarat":"GJ","Haryana":"HR","Himachal Pradesh":"HP","Jammu and Kashmir":"JK","Jharkhand":"JH","Karnataka":"KA","Kerala":"KL","Ladakh":"LA","Lakshadweep":"LD","Madhya Pradesh":"MP","Maharashtra":"MH","Manipur":"MN","Meghalaya":"ML","Mizoram":"MZ","Nagaland":"NL","Odisha":"OR","Puducherry":"PY","Punjab":"PB","Rajasthan":"RJ","Sikkim":"SK","Tamil Nadu":"TN","Telangana":"TS","Tripura":"TR","Uttar Pradesh":"UP","Uttarakhand":"UK","West Bengal":"WB"};
const re = /<path id="PIN_[^"]*" data-pincode="([^"]*)" data-office="([^"]*)"[^>]*? data-state="([^"]*)" d="([^"]*)"/g;
const by = {}; let m;
const dec = s => s.replace(/&amp;/g,'&');
const r1 = n => Math.round(parseFloat(n)*10)/10;
while ((m = re.exec(src))) {
  const code = codes[dec(m[3])]; if (!code) continue;
  const toks = m[4].split(/\s+/); let out = [], last = '';
  for (const t of toks) { out.push(/^[A-Z]$/.test(t) ? t : r1(t)); }
  (by[code] ||= []).push([m[1], dec(m[2]).replace(/ [A-Z]\.O\.?$/,''), out.join(' ')]);
}
fs.mkdirSync('public/data/pincodes',{recursive:true});
let total=0;
for (const [c, arr] of Object.entries(by)) { const f=`public/data/pincodes/${c}.json`; fs.writeFileSync(f, JSON.stringify(arr)); total+=fs.statSync(f).size; }
console.log(Object.keys(by).length, (total/1e6).toFixed(1)+'MB');
console.log(Object.entries(by).map(([c])=>[c,fs.statSync(`public/data/pincodes/${c}.json`).size]).sort((a,b)=>b[1]-a[1]).slice(0,4));
