import { describe, expect, it } from 'vitest';
import { getNavigatorYears, NAVIGATOR_YEAR_SPAN } from './timeNavigatorYears';

describe('timeNavigatorYears', () => {
  it('returns 10 years ending at anchor', () => {
    expect(getNavigatorYears(2026)).toEqual([
      2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
    ]);
    expect(getNavigatorYears(2026)).toHaveLength(NAVIGATOR_YEAR_SPAN);
  });
});