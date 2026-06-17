import { describe, expect, it } from 'vitest';
import {
  EXPENSE_CATEGORY_I18N_KEYS,
  FIXED_EXPENSE_CATEGORY_I18N_KEYS,
  getExpenseCategoryLabel,
  getFixedExpenseCategoryLabel,
} from './categoryLabels';
import en from '@/i18n/locales/en';

const t = (key: string) => {
  const parts = key.split('.');
  let value: unknown = en;
  for (const part of parts) {
    value = (value as Record<string, unknown>)?.[part];
  }
  return typeof value === 'string' ? value : key;
};

describe('categoryLabels', () => {
  it('maps every expense category to a translated label', () => {
    for (const [category, key] of Object.entries(EXPENSE_CATEGORY_I18N_KEYS)) {
      const label = getExpenseCategoryLabel(category as keyof typeof EXPENSE_CATEGORY_I18N_KEYS, t);
      expect(label).toBe(t(key));
      expect(label).not.toBe(category);
    }
  });

  it('maps every fixed expense category to a translated label', () => {
    for (const [category, key] of Object.entries(FIXED_EXPENSE_CATEGORY_I18N_KEYS)) {
      const label = getFixedExpenseCategoryLabel(
        category as keyof typeof FIXED_EXPENSE_CATEGORY_I18N_KEYS,
        t
      );
      expect(label).toBe(t(key));
      expect(label).not.toBe(category);
    }
  });
});