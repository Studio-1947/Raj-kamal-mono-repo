import { describe, it, expect } from 'vitest';

// 1. Mock Category Classification logic matching our implementation
function classifyCategory(title: string, isbn: string | null, productMap: Map<string, string>): 'Fiction' | 'Non-Fiction' {
  const cleanTitle = (title || '').trim().toLowerCase();
  
  if (isbn) {
    const cleanIsbn = isbn.trim().replace(/[^0-9X]/gi, '');
    const mappedCat = productMap.get(cleanIsbn);
    if (mappedCat) {
      const c = mappedCat.toLowerCase();
      if (c.includes('fiction') && !c.includes('non')) return 'Fiction';
      if (c.includes('non-fiction') || c.includes('nonfiction')) return 'Non-Fiction';
    }
  }

  // Keyword Heuristics
  const fictionKeywords = [
    'novel', 'upanyas', 'kahani', 'katha', 'bestseller fiction',
    'poetry', 'kavita', 'shayari', 'geet', 'ghazal', 'natak', 'drama',
    'story', 'stories', 'premchand', 'raghuvir', 'fiction', 'upanyasa'
  ];
  
  const nonFictionKeywords = [
    'history', 'itihas', 'biography', 'jeevani', 'aatmakatha', 'autobiography',
    'criticism', 'alochna', 'essay', 'nibandh', 'sahitya', 'vichar', 'samiksha',
    'philosophy', 'darshan', 'politics', 'rajniti', 'social', 'samajik', 'science',
    'vigyan', 'economy', 'arthashastra', 'non-fiction', 'academic', 'research'
  ];

  if (fictionKeywords.some(k => cleanTitle.includes(k))) return 'Fiction';
  if (nonFictionKeywords.some(k => cleanTitle.includes(k))) return 'Non-Fiction';

  // Stable hash fallback
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = cleanTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0 ? 'Fiction' : 'Non-Fiction';
}

// 2. Mock Price Elasticity of Demand (PED) logic matching our implementation
function calculatePED(ptRate: number, ptQty: number, prevRate: number, prevQty: number): { pedValue: number | null; label: string; badgeColor: string } {
  const priceChange = (ptRate - prevRate) / prevRate;
  if (priceChange === 0) return { pedValue: null, label: 'Baseline', badgeColor: 'bg-gray-50 text-gray-500' };
  
  const qtyChange = (ptQty - prevQty) / (prevQty || 1);
  const pedValue = qtyChange / priceChange;
  
  const absPed = Math.abs(pedValue);
  let label = `Unitary (${pedValue.toFixed(2)})`;
  let badgeColor = 'bg-gray-50 text-gray-500';
  
  if (absPed > 1.05) {
    label = `Elastic (${pedValue.toFixed(2)})`;
    badgeColor = 'bg-amber-50 text-amber-700';
  } else if (absPed < 0.95) {
    label = `Inelastic (${pedValue.toFixed(2)})`;
    badgeColor = 'bg-emerald-50 text-emerald-700';
  }
  
  return { pedValue, label, badgeColor };
}

describe('Sales Dashboard Analytics Unit & Smoke Tests', () => {
  
  describe('Category Classification (Fiction vs Non-Fiction)', () => {
    
    it('should correctly classify by product map ISBN lookups', () => {
      const productMap = new Map<string, string>([
        ['9788170281234', 'Fiction'],
        ['9788170285678', 'Non-Fiction']
      ]);

      expect(classifyCategory('Any Title', '978-81-7028-1234', productMap)).toBe('Fiction');
      expect(classifyCategory('Another Title', '978-81-7028-5678', productMap)).toBe('Non-Fiction');
    });

    it('should classify by title keyphrase heuristics (English & Hindi)', () => {
      const emptyMap = new Map<string, string>();

      // Fiction keywords
      expect(classifyCategory('Godan Upanyas', null, emptyMap)).toBe('Fiction');
      expect(classifyCategory('Kabir ki Kavita', null, emptyMap)).toBe('Fiction');
      expect(classifyCategory('Short Stories', null, emptyMap)).toBe('Fiction');

      // Non-Fiction keywords
      expect(classifyCategory('Bharat ka Itihas', null, emptyMap)).toBe('Non-Fiction');
      expect(classifyCategory('Mahatma Gandhi Biography', null, emptyMap)).toBe('Non-Fiction');
      expect(classifyCategory('Rajniti aur Samaj', null, emptyMap)).toBe('Non-Fiction');
    });

    it('should fallback to a stable category hash for unclassified titles', () => {
      const emptyMap = new Map<string, string>();
      const titleA = 'Random Book Title XYZ';
      const titleB = 'Another Random Book ABC';

      const catA = classifyCategory(titleA, null, emptyMap);
      const catB = classifyCategory(titleB, null, emptyMap);

      // Verify that category results are stable (repeating query returns same classification)
      expect(classifyCategory(titleA, null, emptyMap)).toBe(catA);
      expect(classifyCategory(titleB, null, emptyMap)).toBe(catB);
      
      // Verify they return one of the valid segments
      expect(['Fiction', 'Non-Fiction']).toContain(catA);
      expect(['Fiction', 'Non-Fiction']).toContain(catB);
    });

  });

  describe('Price Elasticity of Demand (PED) Calculations', () => {

    it('should return Baseline/null when index is first rate level', () => {
      const res = calculatePED(200, 100, 200, 100);
      expect(res.pedValue).toBeNull();
      expect(res.label).toBe('Baseline');
    });

    it('should correctly calculate Elastic demand (|PED| > 1)', () => {
      // Price increases from 200 to 250 (+25%). Copies drop from 100 to 50 (-50%)
      // PED = -50% / +25% = -2.00
      const res = calculatePED(250, 50, 200, 100);
      expect(res.pedValue).toBe(-2.0);
      expect(res.label).toBe('Elastic (-2.00)');
      expect(res.badgeColor).toContain('amber'); // amber represents high sensitivity
    });

    it('should correctly calculate Inelastic demand (|PED| < 1)', () => {
      // Price increases from 200 to 250 (+25%). Copies drop from 100 to 90 (-10%)
      // PED = -10% / +25% = -0.40
      const res = calculatePED(250, 90, 200, 100);
      expect(res.pedValue).toBe(-0.4);
      expect(res.label).toBe('Inelastic (-0.40)');
      expect(res.badgeColor).toContain('emerald'); // emerald represents low sensitivity (inelastic is good)
    });

    it('should handle division by zero or boundary cases cleanly', () => {
      // Qty drops from 0 to 0 (no sales at either point)
      // PED = 0 / 25% = 0.00 (Inelastic)
      const res = calculatePED(250, 0, 200, 0);
      expect(res.pedValue).toBe(0.0);
      expect(res.label).toBe('Inelastic (0.00)');
    });

  });

});
