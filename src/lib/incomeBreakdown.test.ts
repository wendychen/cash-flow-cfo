import { describe, expect, it } from 'vitest';
import { computeIncomeBreakdown } from './incomeBreakdown';
import type { Income } from '@/types/income';

describe('incomeBreakdown', () => {
  it('splits cash and accrued totals', () => {
    const incomes: Income[] = [
      { id: '1', date: '2026-01-01', source: 'Salary', amount: 1000, incomeType: 'cash' },
      { id: '2', date: '2026-01-15', source: 'Bonus', amount: 500, incomeType: 'accrued' },
    ];
    const breakdown = computeIncomeBreakdown(incomes);
    expect(breakdown.cash).toBe(1000);
    expect(breakdown.accrued).toBe(500);
    expect(breakdown.total).toBe(1500);
    expect(breakdown.cashPercent).toBe(67);
    expect(breakdown.accruedPercent).toBe(33);
  });

  it('returns zeros for empty input', () => {
    const breakdown = computeIncomeBreakdown([]);
    expect(breakdown.total).toBe(0);
    expect(breakdown.cashPercent).toBe(0);
  });
});