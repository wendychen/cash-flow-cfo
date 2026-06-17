import { describe, expect, it } from 'vitest';
import {
  buildAccruedCollectionIncome,
  getAccruedCollectionStatus,
  validateAccruedAmountUpdate,
  validateCollectionAmount,
  validateIncomeTypeChange,
} from './incomeConversion';
import type { Income } from '@/types/income';

const accrued: Income = {
  id: 'a1',
  date: '2026-01-01',
  source: 'Invoice #1',
  amount: 1000,
  incomeType: 'accrued',
};

const partialCollection: Income = {
  id: 'c1',
  date: '2026-01-15',
  source: 'Invoice #1',
  amount: 400,
  incomeType: 'cash',
  linkedAccruedIncomeId: 'a1',
};

describe('incomeConversion', () => {
  it('computes collection status', () => {
    const status = getAccruedCollectionStatus(accrued, [accrued, partialCollection]);
    expect(status.collected).toBe(400);
    expect(status.outstanding).toBe(600);
    expect(status.percentCollected).toBe(40);
    expect(status.isFullyCollected).toBe(false);
  });

  it('validates collection amount against outstanding', () => {
    expect(validateCollectionAmount(accrued, 600, [accrued, partialCollection]).valid).toBe(true);
    const over = validateCollectionAmount(accrued, 601, [accrued, partialCollection]);
    expect(over.valid).toBe(false);
    if (!over.valid) {
      expect(over.errorKey).toBe('income.collection.errors.exceedsOutstanding');
    }
  });

  it('returns error keys for invalid collection input', () => {
    const cashIncome = { ...accrued, incomeType: 'cash' as const };
    const notAccrued = validateCollectionAmount(cashIncome, 100, [cashIncome]);
    expect(notAccrued.valid).toBe(false);
    if (!notAccrued.valid) {
      expect(notAccrued.errorKey).toBe('income.collection.errors.notAccrued');
    }

    const invalidAmount = validateCollectionAmount(accrued, 0, [accrued]);
    expect(invalidAmount.valid).toBe(false);
    if (!invalidAmount.valid) {
      expect(invalidAmount.errorKey).toBe('income.collection.errors.invalidAmount');
    }
  });

  it('builds linked cash collection entry', () => {
    const built = buildAccruedCollectionIncome(accrued, {
      date: '2026-02-01',
      amount: 200,
    });
    expect(built.incomeType).toBe('cash');
    expect(built.linkedAccruedIncomeId).toBe('a1');
    expect(built.amount).toBe(200);
  });

  it('prevents accrued amount below collected', () => {
    const result = validateAccruedAmountUpdate(accrued, 300, [accrued, partialCollection]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorKey).toBe('income.collection.errors.belowCollected');
    }
  });

  it('blocks accrued to cash when collections exist', () => {
    const result = validateIncomeTypeChange(accrued, 'cash', [accrued, partialCollection]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorKey).toBe('income.collection.errors.hasCollections');
    }
  });

  it('blocks type change on collection entries', () => {
    const result = validateIncomeTypeChange(partialCollection, 'accrued', [
      accrued,
      partialCollection,
    ]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorKey).toBe('income.collection.errors.collectionTypeLocked');
    }
  });
});