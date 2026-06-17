import { describe, expect, it } from 'vitest';
import {
  buildSimulationChartData,
  deadlineToSimulationMonth,
  getProjectedSavingsAtMonth,
  LONG_TERM_SIMULATOR_MONTHS,
  runCashFlowSimulation,
  simulateGoalFundingSchedule,
} from './cashFlowSimulation';

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

  it('supports 20-year (240 month) horizon', () => {
    const result = runCashFlowSimulation({
      monthlyIncome: 10000,
      monthlyExpenses: 8000,
      currentSavings: 0,
      incomeChange: 0,
      expenseChange: 0,
      months: LONG_TERM_SIMULATOR_MONTHS,
    });

    expect(result.months).toHaveLength(240);
    expect(result.endingSavings).toBe(240 * 2000);
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

describe('simulateGoalFundingSchedule', () => {
  const NOW = new Date('2026-06-17T12:00:00');

  it('maps deadlines to simulation months', () => {
    expect(deadlineToSimulationMonth('2026-06-30', NOW)).toBe(1);
    expect(deadlineToSimulationMonth('2026-08-15', NOW)).toBe(3);
  });

  it('flags shortfall when projected savings cannot cover sequential goal needs', () => {
    const result = simulateGoalFundingSchedule(
      {
        monthlyIncome: 5000,
        monthlyExpenses: 4500,
        currentSavings: 1000,
        simulationMonths: 12,
        checkpoints: [
          {
            goalId: 'g1',
            title: 'Soon',
            deadline: '2026-08-01',
            fundingNeed: 3000,
          },
          {
            goalId: 'g2',
            title: 'Later',
            deadline: '2026-10-01',
            fundingNeed: 2000,
          },
        ],
      },
      NOW
    );

    const g1 = result.checkpoints.find((c) => c.goalId === 'g1');
    const g2 = result.checkpoints.find((c) => c.goalId === 'g2');

    expect(g1?.simulationMonth).toBe(3);
    expect(g1?.atRisk).toBe(true);
    expect(g1?.shortfall).toBeGreaterThan(0);
    expect(g2?.atRisk).toBe(true);
  });

  it('passes when savings trajectory covers all goals', () => {
    const sim = runCashFlowSimulation({
      monthlyIncome: 10000,
      monthlyExpenses: 2000,
      currentSavings: 20000,
      incomeChange: 0,
      expenseChange: 0,
      months: 6,
    });

    expect(getProjectedSavingsAtMonth(sim, 3)).toBe(44000);

    const result = simulateGoalFundingSchedule(
      {
        monthlyIncome: 10000,
        monthlyExpenses: 2000,
        currentSavings: 20000,
        simulationMonths: 6,
        checkpoints: [
          {
            goalId: 'g1',
            title: 'Trip',
            deadline: '2026-08-01',
            fundingNeed: 10000,
          },
        ],
      },
      NOW
    );

    expect(result.checkpoints[0].atRisk).toBe(false);
    expect(result.checkpoints[0].shortfall).toBe(0);
  });
});