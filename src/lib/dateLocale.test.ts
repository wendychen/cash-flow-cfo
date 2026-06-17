import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { getDateFnsLocale } from './dateLocale';

describe('getDateFnsLocale', () => {
  const sample = new Date(2026, 5, 16, 14, 30);

  it('formats Japanese month names', () => {
    const label = format(sample, 'MMMM d, yyyy', { locale: getDateFnsLocale('ja') });
    expect(label).toContain('6');
    expect(label).not.toBe(format(sample, 'MMMM d, yyyy', { locale: getDateFnsLocale('en') }));
  });

  it('falls back to en-US for unknown locale', () => {
    expect(getDateFnsLocale('fr')).toBe(getDateFnsLocale('en'));
  });
});