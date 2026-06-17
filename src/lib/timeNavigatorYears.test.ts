import { describe, expect, it } from 'vitest';
import {
  getNavigatorYears,
  isFutureNavigatorYear,
  NAVIGATOR_YEAR_SPAN,
  NAVIGATOR_YEARS_FUTURE,
  NAVIGATOR_YEARS_PAST,
} from './timeNavigatorYears';

describe('timeNavigatorYears', () => {
  it('returns past + anchor + future years', () => {
    expect(getNavigatorYears(2026)).toEqual([
      2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033,
      2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041, 2042, 2043, 2044, 2045, 2046,
    ]);
    expect(getNavigatorYears(2026)).toHaveLength(NAVIGATOR_YEAR_SPAN);
    expect(NAVIGATOR_YEARS_PAST).toBe(5);
    expect(NAVIGATOR_YEARS_FUTURE).toBe(20);
  });

  it('flags years beyond the current calendar year as future', () => {
    expect(isFutureNavigatorYear(2026, 2026)).toBe(false);
    expect(isFutureNavigatorYear(2027, 2026)).toBe(true);
  });
});