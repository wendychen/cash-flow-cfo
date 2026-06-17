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
    expect(breakdown.accruedGross).toBe(500);
    expect(breakdown.accrued).toBe(500);
    expect(breakdown.collected).toBe(0);
    expect(breakdown.total).toBe(1500);
    expect(breakdown.cashPercent).toBe(67);
    expect(breakdown.accruedPercent).toBe(33);
  });

  it('uses outstanding accrued when collections exist', () => {
    const incomes: Income[] = [
      { id: 'a1', date: '2026-01-01', source: 'Invoice', amount: 1000, incomeType: 'accrued' },
      {
        id: 'c1',
        date: '2026-01-15',
        source: 'Invoice',
        amount: 400,
        incomeType: 'cash',
        linkedAccruedIncomeId: 'a1',
      },
      { id: 'c2', date: '2026-01-20', source: 'Other', amount: 200, incomeType: 'cash' },
    ];
    const breakdown = computeIncomeBreakdown(incomes);
    expect(breakdown.cash).toBe(600);
    expect(breakdown.accrued).toBe(600);
    expect(breakdown.collected).toBe(400);
    expect(breakdown.total).toBe(1200);
  });

  it('returns zeros for empty input', () => {
    const breakdown = computeIncomeBreakdown([]);
    expect(breakdown.total).toBe(0);
    expect(breakdown.cashPercent).toBe(0);
  });
});