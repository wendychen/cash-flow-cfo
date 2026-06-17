import { describe, expect, it } from 'vitest';
import { buildFinanceCsv, hasExportableData } from './csvExport';
import type { FinanceStateV2 } from '@/stores/finance/financeStore';

const state: FinanceStateV2 = {
  version: 2,
  expenses: [],
  incomes: [{ id: 'i1', date: '2026-01-01', source: 'Job', amount: 100, incomeType: 'cash' }],
  savings: [],
  fixedExpenses: [],
  targets: [],
  longTermFinGoal: null,
  goals: [],
  tasks: [],
};

describe('csvExport', () => {
  it('detects exportable data', () => {
    expect(hasExportableData(state)).toBe(true);
    expect(hasExportableData({ ...state, incomes: [] })).toBe(false);
  });

  it('builds incomes section', () => {
    const csv = buildFinanceCsv(state);
    expect(csv).toContain('### INCOMES ###');
    expect(csv).toContain('Job');
    expect(csv).toContain('cash');
  });

  it('builds long term fin goal section', () => {
    const csv = buildFinanceCsv({
      ...state,
      incomes: [],
      longTermFinGoal: {
        targetAmount: 1e6,
        endYear: 2046,
        horizonYears: 20,
        presetKey: '1M',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    });
    expect(csv).toContain('### LONG TERM FIN GOAL ###');
    expect(csv).toContain('1M');
    expect(hasExportableData({ ...state, incomes: [], longTermFinGoal: { targetAmount: 1, endYear: 2046, horizonYears: 20, updatedAt: '' } })).toBe(true);
  });
});