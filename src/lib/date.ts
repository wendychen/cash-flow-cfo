/**
 * Timezone-safe date utilities for Cash Flow CFO.
 *
 * All YYYY-MM-DD strings are parsed as local calendar dates (not UTC midnight).
 * Period comparisons use inclusive start-of-day / end-of-day bounds so records
 * on the last day of a week/month/quarter are never dropped.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DatePeriod {
  startDate: Date;
  endDate: Date;
}

/** Parse a date string as local midnight. Supports YYYY-MM-DD and ISO datetimes. */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;

  const trimmed = dateStr.trim();
  const match = DATE_ONLY_RE.exec(trimmed);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Normalize period bounds for inclusive comparisons. */
export function normalizePeriodBounds(period: DatePeriod): DatePeriod {
  return {
    startDate: startOfDay(period.startDate),
    endDate: endOfDay(period.endDate),
  };
}

/**
 * Returns true when dateStr falls within period (inclusive on both ends).
 * Empty dateStr returns true (caller may treat as "no date filter").
 */
export function isDateInPeriod(
  dateStr: string | undefined | null,
  period: DatePeriod | null
): boolean {
  if (!period) return true;
  if (!dateStr) return true;

  const date = parseLocalDate(dateStr);
  if (!date) return true;

  const { startDate, endDate } = normalizePeriodBounds(period);
  return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
}

/** Weeks within a calendar month (W1 starts on the 1st). Matches TimeNavigator. */
export function getWeeksInMonth(
  year: number,
  month: number
): { week: number; startDate: Date; endDate: Date }[] {
  const weeks: { week: number; startDate: Date; endDate: Date }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentDate = new Date(firstDay);
  let weekNum = 1;

  while (currentDate <= lastDay) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekEnd > lastDay) {
      weekEnd.setTime(lastDay.getTime());
    }

    weeks.push({
      week: weekNum,
      startDate: weekStart,
      endDate: weekEnd,
    });

    currentDate = new Date(weekEnd);
    currentDate.setDate(currentDate.getDate() + 1);
    weekNum++;
  }

  return weeks;
}

export function buildMonthPeriod(year: number, monthIndex: number): DatePeriod {
  return {
    startDate: new Date(year, monthIndex, 1),
    endDate: new Date(year, monthIndex + 1, 0),
  };
}

export function buildQuarterPeriod(year: number, quarterIndex: number): DatePeriod {
  const months = [0, 3, 6, 9];
  const startMonth = months[quarterIndex];
  return {
    startDate: new Date(year, startMonth, 1),
    endDate: new Date(year, startMonth + 3, 0),
  };
}