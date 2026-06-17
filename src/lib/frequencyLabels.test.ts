import { describe, expect, it } from 'vitest';
import { FREQUENCY_META } from './frequencyLabels';

describe('frequencyLabels', () => {
  it('clarifies bi-monthly is twice per month', () => {
    expect(FREQUENCY_META['bi-monthly'].description).toContain('Twice per month');
    expect(FREQUENCY_META['bi-monthly'].description).toContain('not');
  });

  it('clarifies bi-weekly is every 2 weeks', () => {
    expect(FREQUENCY_META['bi-weekly'].shortHint).toBe('Every 2 weeks');
    expect(FREQUENCY_META['bi-weekly'].description).toContain('14 days');
  });
});