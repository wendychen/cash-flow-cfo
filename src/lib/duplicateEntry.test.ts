import { describe, expect, it } from 'vitest';
import { duplicateEntry } from './duplicateEntry';

describe('duplicateEntry', () => {
  it('strips id and preserves all other fields', () => {
    const original = {
      id: 'abc-123',
      date: '2026-04-30',
      description: 'Coffee',
      amount: 150,
      originalAmount: 5,
      originalCurrency: 'USD' as const,
      timeCost: '15m',
      needsCheck: false,
      category: 'food' as const,
    };

    const copy = duplicateEntry(original);

    expect(copy).not.toHaveProperty('id');
    expect(copy).toEqual({
      date: '2026-04-30',
      description: 'Coffee',
      amount: 150,
      originalAmount: 5,
      originalCurrency: 'USD',
      timeCost: '15m',
      needsCheck: false,
      category: 'food',
    });
  });

  it('produces independent objects', () => {
    const original = { id: 'x', note: 'test', amount: 100 };
    const copy = duplicateEntry(original);
    expect(copy).not.toBe(original);
    expect(copy.note).toBe('test');
  });
});