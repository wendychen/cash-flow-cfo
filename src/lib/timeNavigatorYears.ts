/** Years before the anchor year (inclusive of anchor). */
export const NAVIGATOR_YEARS_PAST = 5;

/** Years after the anchor year — aligned with 20-year fin goal horizon. */
export const NAVIGATOR_YEARS_FUTURE = 20;

export const NAVIGATOR_YEAR_SPAN = NAVIGATOR_YEARS_PAST + 1 + NAVIGATOR_YEARS_FUTURE;

export function getNavigatorYears(anchorYear = new Date().getFullYear()): number[] {
  const start = anchorYear - NAVIGATOR_YEARS_PAST;
  return Array.from({ length: NAVIGATOR_YEAR_SPAN }, (_, i) => start + i);
}

export function isFutureNavigatorYear(year: number, nowYear = new Date().getFullYear()): boolean {
  return year > nowYear;
}