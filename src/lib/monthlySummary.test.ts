import { describe, expect, it } from 'vitest';
import {
  buildMonthlySummaryData,
  computeHistoricalAverages,
  computeMonthIncomeSplit,
  getCurrentMonthKey,
} from './monthlySummary';
import type { Expense } from '@/types/expense';
import type { Income } from '@/types/income';
import type { Saving } from '@/types/saving';

const now = new Date(2026, 5, 15); // June 2026

const incomes: Income[] = [
  { id: 'i1', amount: 10000, date: '2026-04-15', incomeType: 'cash', source: 'Salary' },
  { id: 'i2', amount: 12000, date: '2026-05-10', incomeType: 'cash', source: 'Salary' },
];

const expenses: Expense[] = [
  {
    id: 'e1',
    amount: 3000,
    date: '2026-04-20',
    category: 'food',
    description: 'Food',
    timeCost: '',
    needsCheck: false,
  },
  {
    id: 'e2',
    amount: 4000,
    date: '2026-05-05',
    category: 'food',
    description: 'Food',
    timeCost: '',
    needsCheck: false,
  },
];

const savings: Saving[] = [
  { id: 's1', amount: 50000, date: '2026-04-30', savingType: 'balance' },
  { id: 's2', amount: 55000, date: '2026-05-31', savingType: 'balance' },
];

describe('monthlySummary', () => {
  it('returns current month key in local time', () => {
    expect(getCurrentMonthKey(new Date(2026, 5, 15))).toBe('2026-06');
  });

  it('computes historical averages from past months only', () => {
    const averages = computeHistoricalAverages({ incomes, expenses, savings, now });
    expect(averages.avgIncome).toBe(11000);
    expect(averages.avgExpenses).toBe(3500);
    expect(averages.latestSavings).toBe(55000);
    expect(averages.avgSavingsGrowth).toBe(5000);
  });

  it('includes current month even without entries', () => {
    const data = buildMonthlySummaryData({
      incomes,
      expenses,
      savings,
      fixedExpenses: [],
      now,
    });
    const current = data.find((m) => m.isCurrentMonth);
    expect(current?.month).toBe('2026-06');
  });

  it('sorts current month first, then past months descending', () => {
    const data = buildMonthlySummaryData({
      incomes,
      expenses,
      savings,
      fixedExpenses: [],
      now,
    });
    const actual = data.filter((m) => !m.isPrediction);
    expect(actual[0].isCurrentMonth).toBe(true);
    expect(actual[1].month).toBe('2026-05');
    expect(actual[2].month).toBe('2026-04');
  });

  it('splits monthly income into cash, accrued, and outstanding', () => {
    const accruedIncomes: Income[] = [
      { id: 'a1', amount: 10000, date: '2026-05-01', incomeType: 'accrued', source: 'Invoice' },
      { id: 'c1', amount: 4000, date: '2026-05-15', incomeType: 'cash', source: 'Salary' },
      {
        id: 'col1',
        amount: 3000,
        date: '2026-05-20',
        incomeType: 'cash',
        source: 'Collection',
        linkedAccruedIncomeId: 'a1',
      },
    ];

    const split = computeMonthIncomeSplit(accruedIncomes, '2026-05', accruedIncomes);
    expect(split.cash).toBe(7000);
    expect(split.accruedGross).toBe(10000);
    expect(split.accruedOutstanding).toBe(7000);

    const data = buildMonthlySummaryData({
      incomes: accruedIncomes,
      expenses: [],
      savings: [],
      fixedExpenses: [],
      now,
    });
    const may = data.find((m) => m.month === '2026-05');
    expect(may?.cashIncome).toBe(7000);
    expect(may?.accruedIncome).toBe(10000);
    expect(may?.accruedOutstanding).toBe(7000);
    expect(may?.totalIncome).toBe(17000);
  });

  it('appends prediction months when enabled', () => {
    const data = buildMonthlySummaryData({
      incomes,
      expenses,
      savings,
      fixedExpenses: [],
      showPredictions: true,
      now,
    });
    const predictions = data.filter((m) => m.isPrediction);
    expect(predictions).toHaveLength(3);
    expect(predictions[0].month).toBe('2026-09');
    expect(predictions[0].totalIncome).toBe(11000);
    expect(predictions[0].netFlow).toBe(11000 - 3500);
  });
});