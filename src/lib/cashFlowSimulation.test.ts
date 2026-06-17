import { describe, expect, it } from 'vitest';
import { buildSimulationChartData, runCashFlowSimulation } from './cashFlowSimulation';

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

  it('tracks baseline cumulative savings per month', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      currentSavings: 500000,
      incomeChange: 0,
      expenseChange: -10000,
      months: 3,
    });

    expect(result.months[0].baselineCumulativeSavings).toBe(540000);
    expect(result.months[2].baselineCumulativeSavings).toBe(620000);
    expect(result.months[2].cumulativeSavings).toBe(650000);
    expect(result.months[2].savingsDelta).toBe(30000);
  });

  it('computes ROI metrics', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      currentSavings: 500000,
      incomeChange: 5000,
      expenseChange: -5000,
      months: 12,
    });

    expect(result.avgMonthlyNet).toBe(50000);
    expect(result.avgMonthlyNetDelta).toBe(10000);
    expect(result.annualizedSavingsGain).toBe(120000);
    expect(result.savingsGrowthPercent).toBeCloseTo(120, 5);
  });

  it('builds chart data from simulation months', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 50000,
      monthlyExpenses: 30000,
      currentSavings: 100000,
      incomeChange: 0,
      expenseChange: 0,
      months: 2,
    });

    const chart = buildSimulationChartData(result.months);
    expect(chart).toHaveLength(2);
    expect(chart[0].scenario).toBe(120000);
    expect(chart[1].baseline).toBe(140000);
  });
});