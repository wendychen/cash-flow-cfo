import type { Income } from '@/types/income';

export interface AccruedCollectionStatus {
  accruedAmount: number;
  collected: number;
  outstanding: number;
  percentCollected: number;
  isFullyCollected: boolean;
}

export function getCollectionsForAccrued(accruedId: string, incomes: Income[]): Income[] {
  return incomes.filter(
    (inc) => inc.incomeType === 'cash' && inc.linkedAccruedIncomeId === accruedId
  );
}

export function getCollectedAmountForAccrued(accruedId: string, incomes: Income[]): number {
  return getCollectionsForAccrued(accruedId, incomes).reduce((sum, inc) => sum + inc.amount, 0);
}

export function getAccruedCollectionStatus(
  accrued: Income,
  incomes: Income[]
): AccruedCollectionStatus {
  const accruedAmount = accrued.amount;
  const collected = getCollectedAmountForAccrued(accrued.id, incomes);
  const outstanding = Math.max(0, accruedAmount - collected);
  const percentCollected =
    accruedAmount > 0 ? Math.min(100, Math.round((collected / accruedAmount) * 100)) : 0;

  return {
    accruedAmount,
    collected,
    outstanding,
    percentCollected,
    isFullyCollected: outstanding <= 0,
  };
}

export function validateCollectionAmount(
  accrued: Income,
  amount: number,
  incomes: Income[]
): { valid: boolean; error?: string } {
  if (accrued.incomeType !== 'accrued') {
    return { valid: false, error: 'Only accrued income can receive collections.' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Collection amount must be greater than zero.' };
  }

  const { outstanding } = getAccruedCollectionStatus(accrued, incomes);
  if (amount > outstanding + 0.001) {
    return { valid: false, error: 'Collection exceeds outstanding accrued balance.' };
  }

  return { valid: true };
}

export function buildAccruedCollectionIncome(
  accrued: Income,
  collection: { date: string; amount: number; note?: string }
): Omit<Income, 'id'> {
  return {
    date: collection.date,
    source: accrued.source,
    amount: collection.amount,
    incomeType: 'cash',
    linkedAccruedIncomeId: accrued.id,
    note: collection.note?.trim() || `Collected accrued: ${accrued.source}`,
  };
}

export function validateAccruedAmountUpdate(
  accrued: Income,
  newAmount: number,
  incomes: Income[]
): { valid: boolean; error?: string } {
  const collected = getCollectedAmountForAccrued(accrued.id, incomes);
  if (newAmount < collected - 0.001) {
    return {
      valid: false,
      error: 'Accrued amount cannot be less than already collected.',
    };
  }
  return { valid: true };
}

export function isAccruedCollection(income: Income): boolean {
  return income.incomeType === 'cash' && !!income.linkedAccruedIncomeId;
}