import { describe, it, expect } from 'vitest';
import { migrateExpenseCategory, EXPENSE_CATEGORIES } from './expenseCategory';

describe('migrateExpenseCategory', () => {
  it('defaults empty to food', () => {
    expect(migrateExpenseCategory(undefined)).toBe('food');
  });

  it('includes necessities in schema', () => {
    expect(EXPENSE_CATEGORIES.necessities.label).toBe('Household Essentials');
  });

  it('migrates legacy business to opex', () => {
    expect(migrateExpenseCategory('business')).toBe('opex');
  });

  it('passes through valid categories', () => {
    expect(migrateExpenseCategory('necessities')).toBe('necessities');
    expect(migrateExpenseCategory('food')).toBe('food');
  });
});