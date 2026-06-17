import { describe, expect, it } from 'vitest';
import { getGoalRepeatLabel } from './goalRepeatLabels';
import type { TranslationKey } from '@/i18n';

const t = (key: TranslationKey) => key;

describe('goalRepeatLabels', () => {
  it('maps repeat intervals to i18n keys', () => {
    expect(getGoalRepeatLabel('monthly', t)).toBe('goals.repeat.monthly');
    expect(getGoalRepeatLabel('weekly', t)).toBe('goals.repeat.weekly');
  });
});