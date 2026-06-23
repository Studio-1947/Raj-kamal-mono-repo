// Canonicalises Indian state names so the messy values in the sales data line up
// with the (older) names used in the India GeoJSON — e.g. the data says "ODISHA"
// but the map polygon is named "Orissa". Used for choropleth colouring, ranking
// and selection matching on both sides of the comparison.

export function normState(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Keyed by normalised data spelling → normalised GeoJSON spelling.
const STATE_ALIASES: Record<string, string> = {
  odisha: 'orissa',
  uttarakhand: 'uttaranchal',
  uttrakhand: 'uttaranchal',
  uttaranchal: 'uttaranchal',
  'jammu': 'jammu and kashmir',
  'jammu & kashmir': 'jammu and kashmir',
  'j&k': 'jammu and kashmir',
  tamilnadu: 'tamil nadu',
  'tamil nadu': 'tamil nadu',
  'arunchal pradesh': 'arunachal pradesh',
  pondicherry: 'puducherry',
  'nct of delhi': 'delhi',
  'new delhi': 'delhi',
  'andaman and nicobar islands': 'andaman and nicobar',
  'andaman & nicobar': 'andaman and nicobar',
};

export function canonState(s: string | null | undefined): string {
  const k = normState(s || '');
  return STATE_ALIASES[k] || k;
}

// Rejects placeholder / junk location values like "-", "n/a", "null".
export function isValidPlace(s: string | null | undefined): boolean {
  const k = normState(s || '');
  if (!k) return false;
  return !['-', '--', '---', 'n/a', 'na', 'null', 'none', 'unknown', '.'].includes(k);
}
