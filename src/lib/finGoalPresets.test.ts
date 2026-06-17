import { describe, expect, it } from 'vitest';
import {
  FIN_GOAL_PRESETS,
  computeFinGoalProgress,
  getDefaultFinGoalEndYear,
  getFinGoalPresetByKey,
  getFinGoalYearsRemaining,
} from './finGoalPresets';

describe('finGoalPresets', () => {
  it('includes trillion-to-thousand ladder', () => {
    expect(FIN_GOAL_PRESETS[0].key).toBe('500T');
    expect(FIN_GOAL_PRESETS.at(-1)?.key).toBe('100K');
    expect(getFinGoalPresetByKey('1M')?.amount).toBe(1e6);
  });

  it('computes progress capped at 100', () => {
    expect(computeFinGoalProgress(50, 100)).toBe(50);
    expect(computeFinGoalProgress(200, 100)).toBe(100);
    expect(computeFinGoalProgress(0, 100)).toBe(0);
  });

  it('defaults end year to anchor + 20', () => {
    expect(getDefaultFinGoalEndYear(2026)).toBe(2046);
    expect(getFinGoalYearsRemaining(2046, 2026)).toBe(20);
  });
});