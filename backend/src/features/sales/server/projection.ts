// Indian financial-year (Apr–Mar) revenue projection shared by every offline/online sales /summary route.

export interface MonthlyRow {
  month: number;          // calendar month 1-12
  total: any;             // net revenue for the month
  last_day?: number | null; // latest day-of-month that has a row
}

export interface FyProjectionInput {
  monthlyRows: MonthlyRow[];
  now: Date;
  yearStart: Date;
  yearEnd: Date;
  fyStartYear: number;
  currentMonth: number;   // 1 = April … 12 = March
}

const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const round2 = (n: number) => Math.round(n * 100) / 100;
const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  try { return Number(v.toString()); } catch { return Number(v) || 0; }
};
const relMonthOf = (calMonth: number) => (calMonth >= 4 ? calMonth - 3 : calMonth + 9);

/**
 * A month with no rows means "no data synced", not "₹0 sales". Such months are flagged `noData`,
 * left out of the run rate, and the current month falls back to the run rate instead of projecting 0.
 * The current month is extrapolated from the last day that actually has data, not from today's date,
 * so a source sheet that lags behind doesn't drag the estimate down.
 */
export function buildFyProjection({ monthlyRows, now, yearStart, yearEnd, fyStartYear, currentMonth }: FyProjectionInput) {
  // A past month whose data stops before its midpoint is a stale/partial sync, not a real month of sales.
  const daysInMonth = (calMonth: number) => {
    const year = calMonth >= 4 ? fyStartYear : fyStartYear + 1;
    return new Date(Date.UTC(year, calMonth, 0)).getUTCDate();
  };
  const isStale = (r: MonthlyRow) => r.last_day != null && Number(r.last_day) < daysInMonth(Number(r.month)) / 2;

  const completeMonths = monthlyRows.filter(r => relMonthOf(Number(r.month)) < currentMonth);
  const currentMonthRow = monthlyRows.find(r => relMonthOf(Number(r.month)) === currentMonth);

  const daysInCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).getUTCDate();
  const currentMonthActual = currentMonthRow ? toNum(currentMonthRow.total) : 0;
  const currentHasData = !!currentMonthRow;
  const daysElapsedInCurrentMonth = currentHasData
    ? Math.max(1, Math.min(now.getDate(), Number(currentMonthRow!.last_day) || now.getDate()))
    : Math.max(1, now.getDate());

  // Weighted average of up to the last 3 complete months that have data (newest = highest weight)
  const recentComplete = completeMonths
    .filter(r => !isStale(r))
    .map(r => ({ ...r, relMonth: relMonthOf(Number(r.month)) }))
    .sort((a, b) => a.relMonth - b.relMonth)
    .slice(-3);

  let weightedMonthlyAvg: number;
  if (recentComplete.length > 0) {
    const weights = recentComplete.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    weightedMonthlyAvg = recentComplete.reduce((acc, m, i) => acc + toNum(m.total) * (weights[i] ?? 1), 0) / totalWeight;
  } else {
    weightedMonthlyAvg = (currentMonthActual / daysElapsedInCurrentMonth) * daysInCurrentMonth;
  }

  const currentMonthProjected = currentHasData
    ? (currentMonthActual / daysElapsedInCurrentMonth) * daysInCurrentMonth
    : weightedMonthlyAvg;

  const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const isComplete = m < currentMonth;
    const isCurrent = m === currentMonth;
    const calMonth = (m + 2) % 12 + 1;
    const row = monthlyRows.find(r => Number(r.month) === calMonth);

    if (isComplete) {
      return { month: m, name: MONTH_NAMES[idx], actual: round2(row ? toNum(row.total) : 0), projected: null, isComplete: true, isCurrent: false, noData: !row || isStale(row) };
    }
    if (isCurrent) {
      return { month: m, name: MONTH_NAMES[idx], actual: round2(currentMonthActual), projected: round2(currentMonthProjected), isComplete: false, isCurrent: true, noData: !currentHasData, daysElapsed: daysElapsedInCurrentMonth, totalDays: daysInCurrentMonth };
    }
    return { month: m, name: MONTH_NAMES[idx], actual: null, projected: round2(weightedMonthlyAvg), isComplete: false, isCurrent: false, noData: false };
  });

  const totalSoFar = completeMonths.reduce((acc, m) => acc + toNum(m.total), 0) + currentMonthActual;
  const daysElapsed = Math.ceil(Math.max(1, now.getTime() - yearStart.getTime()) / 86400000);
  const dailyAvg = totalSoFar / daysElapsed;
  const remainingDays = Math.ceil((yearEnd.getTime() - now.getTime()) / 86400000);
  const projectedRemaining = round2((currentMonthProjected - currentMonthActual) + (12 - currentMonth) * weightedMonthlyAvg);
  const totalProjected = round2(totalSoFar + projectedRemaining);

  return {
    year: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
    totalSoFar: round2(totalSoFar),
    daysElapsed,
    dailyAvg: round2(dailyAvg),
    remainingDays,
    projectedRemaining,
    totalProjected,
    weightedMonthlyAvg: round2(weightedMonthlyAvg),
    currentMonth,
    monthlyBreakdown,
  };
}
