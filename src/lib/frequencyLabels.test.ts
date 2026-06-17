import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en';
import {
  FREQUENCY_I18N_KEYS,
  FREQUENCY_META,
  getFrequencyMeta,
} from './frequencyLabels';

const t = (key: string) => {
  const parts = key.split('.');
  let value: unknown = en;
  for (const part of parts) {
    value = (value as Record<string, unknown>)?.[part];
  }
  return typeof value === 'string' ? value : key;
};

describe('frequencyLabels', () => {
  it('clarifies bi-monthly is twice per month', () => {
    expect(FREQUENCY_META['bi-monthly'].description).toContain('Twice per month');
    expect(FREQUENCY_META['bi-monthly'].description).toContain('not');
  });

  it('clarifies bi-weekly is every 2 weeks', () => {
    expect(FREQUENCY_META['bi-weekly'].shortHint).toBe('Every 2 weeks');
    expect(FREQUENCY_META['bi-weekly'].description).toContain('14 days');
  });

  it('maps every frequency to translated metadata', () => {
    for (const [frequency, keys] of Object.entries(FREQUENCY_I18N_KEYS)) {
      const meta = getFrequencyMeta(frequency as keyof typeof FREQUENCY_I18N_KEYS, t);
      expect(meta.label).toBe(t(keys.label));
      expect(meta.shortHint).toBe(t(keys.shortHint));
      expect(meta.description).toBe(t(keys.description));
    }
  });
});