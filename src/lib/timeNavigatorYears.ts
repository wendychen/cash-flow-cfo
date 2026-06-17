/** Number of years shown in Time Navigator (inclusive span). */
export const NAVIGATOR_YEAR_SPAN = 10;

/** Years before the anchor year (anchor + past = 10 years). */
export const NAVIGATOR_YEARS_PAST = NAVIGATOR_YEAR_SPAN - 1;

export function getNavigatorYears(anchorYear = new Date().getFullYear()): number[] {
  const start = anchorYear - NAVIGATOR_YEARS_PAST;
  return Array.from({ length: NAVIGATOR_YEAR_SPAN }, (_, i) => start + i);
}