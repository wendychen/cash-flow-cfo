import { describe, expect, it } from 'vitest';
import { runCashFlowSimulation } from './cashFlowSimulation';

describe('runCashFlowSimulation', () => {
  it('projects savings with expense reduction', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      currentSavings: 500000,
      incomeChange: 0,
      expenseChange: -10000,
      months: 12,
    });

    expect(result.endingSavings).toBe(500000 + 12 * 50000);
    expect(result.savingsDelta).toBe(12 * 10000);
  });

  it('clamps expenses at zero', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 50000,
      monthlyExpenses: 10000,
      currentSavings: 0,
      incomeChange: 0,
      expenseChange: -50000,
      months: 3,
    });

    expect(result.months[0].expenses).toBe(0);
    expect(result.months[0].net).toBe(50000);
  });
});