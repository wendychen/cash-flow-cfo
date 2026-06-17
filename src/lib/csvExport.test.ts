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
});