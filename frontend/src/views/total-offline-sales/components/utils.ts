export const REGIONAL_COLORS: Record<string, string> = {
  'Delhi Offline': '#3B82F6', // Blue
  'Mumbai Offline': '#10B981', // Green
  'Patna Offline': '#8B5CF6', // Purple
  'Online - Website': '#F97316', // Orange
  'BookFair Offline': '#EC4899', // Pink
  'Lokbharti - Allahabad': '#0D9488' // Teal
};

export const CHART_KEYS = ['Delhi', 'Mumbai', 'Patna', 'Online', 'BookFair', 'Lokbharti'];

export const KEY_MAP: Record<string, string> = {
  'Delhi': 'Delhi Offline',
  'Mumbai': 'Mumbai Offline',
  'Patna': 'Patna Offline',
  'Online': 'Online - Website',
  'BookFair': 'BookFair Offline',
  'Lokbharti': 'Lokbharti - Allahabad'
};

export function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

export function formatLakhsAndCrores(n: number): string {
  if (n >= 10000000) {
    return `₹${(n / 10000000).toFixed(2)} Cr`;
  } else if (n >= 100000) {
    return `₹${(n / 100000).toFixed(2)} L`;
  } else {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

export function formatChartValue(n: number): string {
  if (n >= 10000000) {
    return `${(n / 10000000).toFixed(1)}Cr`;
  } else if (n >= 100000) {
    const val = n / 100000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}L`;
  } else if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  } else {
    return Math.round(n).toString();
  }
}
