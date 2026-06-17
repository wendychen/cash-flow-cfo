import { describe, expect, it } from 'vitest';
import {
  buildAccruedCollectionIncome,
  getAccruedCollectionStatus,
  validateAccruedAmountUpdate,
  validateCollectionAmount,
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
    expect(validateCollectionAmount(accrued, 601, [accrued, partialCollection]).valid).toBe(false);
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
  });
});