import { describe, it, expect } from 'vitest';

// Simulates the exact logic implemented in the backend router endpoints
function calculateFYStartYear(now: Date): { fyStartYear: number; currentMonth: number } {
  const currentYear = now.getFullYear();
  const currentMonthCalendar = now.getMonth(); // 0-indexed: April = 3
  const fyStartYear = currentMonthCalendar >= 3 ? currentYear : currentYear - 1;
  const currentMonth = (currentMonthCalendar >= 3) ? (currentMonthCalendar - 2) : (currentMonthCalendar + 10);
  return { fyStartYear, currentMonth };
}

function getRelativeMonth(calMonth: number): number {
  return (calMonth >= 4) ? (calMonth - 3) : (calMonth + 9);
}

function getCalendarMonthFromRelative(m: number): number {
  return (m + 2) % 12 + 1;
}

describe('SALES-01: Indian Financial Year Calculations', () => {
  it('correctly calculates fyStartYear based on calendar month', () => {
    // April 2026 -> FY starts 2026
    expect(calculateFYStartYear(new Date(2026, 3, 15, 12, 0, 0)).fyStartYear).toBe(2026);
    
    // December 2026 -> FY starts 2026
    expect(calculateFYStartYear(new Date(2026, 11, 5, 12, 0, 0)).fyStartYear).toBe(2026);
    
    // January 2027 -> FY starts 2026
    expect(calculateFYStartYear(new Date(2027, 0, 10, 12, 0, 0)).fyStartYear).toBe(2026);
    
    // March 2027 -> FY starts 2026
    expect(calculateFYStartYear(new Date(2027, 2, 31, 23, 59, 59)).fyStartYear).toBe(2026);

    // March 2026 -> FY starts 2025
    expect(calculateFYStartYear(new Date(2026, 2, 15, 12, 0, 0)).fyStartYear).toBe(2025);
  });

  it('correctly maps calendar month to relative financial year month (April = 1, March = 12)', () => {
    // April (4) -> Relative month 1
    expect(getRelativeMonth(4)).toBe(1);
    
    // December (12) -> Relative month 9
    expect(getRelativeMonth(12)).toBe(9);
    
    // January (1) -> Relative month 10
    expect(getRelativeMonth(1)).toBe(10);
    
    // March (3) -> Relative month 12
    expect(getRelativeMonth(3)).toBe(12);
  });

  it('correctly maps relative financial year month back to calendar month', () => {
    // Relative month 1 (April) -> Calendar month 4
    expect(getCalendarMonthFromRelative(1)).toBe(4);
    
    // Relative month 9 (December) -> Calendar month 12
    expect(getCalendarMonthFromRelative(9)).toBe(12);
    
    // Relative month 10 (January) -> Calendar month 1
    expect(getCalendarMonthFromRelative(10)).toBe(1);
    
    // Relative month 12 (March) -> Calendar month 3
    expect(getCalendarMonthFromRelative(12)).toBe(3);
  });
});
