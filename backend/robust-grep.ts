
import fs from 'fs';
const content = fs.readFileSync('src/features/sales/server/offline.routes.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('max(') || line.toLowerCase().includes('rate')) {
    console.log(`${i+1}: ${line}`);
  }
});
