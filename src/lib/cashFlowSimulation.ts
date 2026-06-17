import { differenceInCalendarMonths, parseISO, startOfMonth } from 'date-fns';
import { parseLocalDate } from '@/lib/date';

export interface SimulationInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  incomeChange: number;
  expenseChange: number;
  months: number;
}

export interface SimulationMonth {
  month: number;
  income: number;
  expenses: number;
  net: number;
  cumulativeSavings: number;
  baselineNet: number;
  baselineCumulativeSavings: number;
  savingsDelta: number;
}

export interface SimulationResult {
  months: SimulationMonth[];
  totalNet: number;
  endingSavings: number;
  baselineEndingSavings: number;
  savingsDelta: number;
  avgMonthlyNet: number;
  avgMonthlyNetDelta: number;
  annualizedSavingsGain: number;
  savingsGrowthPercent: number | null;
}

export interface SimulationChartPoint {
  month: number;
  label: string;
  scenario: number;
  baseline: number;
}

/** 20-year projection horizon (months), aligned with long-term fin goal. */
export const LONG_TERM_SIMULATOR_MONTHS = 240;

export function buildSimulationChartData(months: SimulationMonth[]): SimulationChartPoint[] {
  return months.map((row) => ({
    month: row.month,
    label: `M${row.month}`,
    scenario: row.cumulativeSavings,
    baseline: row.baselineCumulativeSavings,
  }));
}

export function runCashFlowSimulation(input: SimulationInput): SimulationResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    incomeChange,
    expenseChange,
    months,
  } = input;

  const monthsData: SimulationMonth[] = [];
  let cumulative = currentSavings;
  let baselineCumulative = currentSavings;

  const baselineNetPerMonth = monthlyIncome - monthlyExpenses;

  for (let m = 1; m <= months; m++) {
    const income = monthlyIncome + incomeChange;
    const expenses = Math.max(0, monthlyExpenses + expenseChange);
    const net = income - expenses;
    cumulative += net;
    baselineCumulative += baselineNetPerMonth;

    monthsData.push({
      month: m,
      income,
      expenses,
      net,
      cumulativeSavings: cumulative,
      baselineNet: baselineNetPerMonth,
      baselineCumulativeSavings: baselineCumulative,
      savingsDelta: cumulative - baselineCumulative,
    });
  }

  const totalNet = monthsData.reduce((sum, row) => sum + row.net, 0);
  const savingsDelta = cumulative - baselineCumulative;
  const safeMonths = Math.max(months, 1);

  return {
    months: monthsData,
    totalNet,
    endingSavings: cumulative,
    baselineEndingSavings: baselineCumulative,
    savingsDelta,
    avgMonthlyNet: totalNet / safeMonths,
    avgMonthlyNetDelta: savingsDelta / safeMonths,
    annualizedSavingsGain: (savingsDelta / safeMonths) * 12,
    savingsGrowthPercent:
      currentSavings > 0 ? ((cumulative - currentSavings) / currentSavings) * 100 : null,
  };
}

export interface GoalFundingCheckpointInput {
  goalId: string;
  title: string;
  /** YYYY-MM-DD effective deadline */
  deadline: string;
  fundingNeed: number;
}

export interface GoalFundingScheduleInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  incomeChange?: number;
  expenseChange?: number;
  simulationMonths: number;
  checkpoints: GoalFundingCheckpointInput[];
}

export interface GoalFundingCheckpointResult {
  goalId: string;
  title: string;
  deadline: string;
  simulationMonth: number;
  fundingNeed: number;
  projectedSavings: number;
  availableSavings: number;
  shortfall: number;
  atRisk: boolean;
}

export interface GoalFundingScheduleResult {
  simulation: SimulationResult;
  checkpoints: GoalFundingCheckpointResult[];
}

/** Map a deadline to 1-based simulation month (month 1 = current calendar month). */
export function deadlineToSimulationMonth(deadline: string, now = new Date()): number | null {
  const parsed = parseLocalDate(deadline) ?? parseISO(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const target = startOfMonth(parsed);
  const start = startOfMonth(now);
  return differenceInCalendarMonths(target, start) + 1;
}

export function getProjectedSavingsAtMonth(
  simulation: SimulationResult,
  monthIndex: number
): number {
  if (simulation.months.length === 0) return simulation.endingSavings;
  const idx = Math.min(Math.max(monthIndex, 1), simulation.months.length) - 1;
  return simulation.months[idx].cumulativeSavings;
}

/**
 * Project savings via cash-flow simulation and check whether each goal's funding
 * need is covered at its deadline (sequential claims by earlier deadlines).
 */
export function simulateGoalFundingSchedule(
  input: GoalFundingScheduleInput,
  now = new Date()
): GoalFundingScheduleResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    incomeChange = 0,
    expenseChange = 0,
    simulationMonths,
    checkpoints,
  } = input;

  const simulation = runCashFlowSimulation({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    incomeChange,
    expenseChange,
    months: simulationMonths,
  });

  const sorted = [...checkpoints]
    .filter((cp) => cp.fundingNeed > 0.01 && cp.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  let claimedByEarlierGoals = 0;
  const results: GoalFundingCheckpointResult[] = [];

  for (const cp of sorted) {
    const simMonth = deadlineToSimulationMonth(cp.deadline, now) ?? 1;
    const effectiveMonth = Math.max(1, simMonth);
    const projected = getProjectedSavingsAtMonth(simulation, effectiveMonth);
    const available = projected - claimedByEarlierGoals;
    const shortfall = Math.max(0, cp.fundingNeed - available);
    const atRisk = shortfall > 0.01;

    results.push({
      goalId: cp.goalId,
      title: cp.title,
      deadline: cp.deadline,
      simulationMonth: effectiveMonth,
      fundingNeed: cp.fundingNeed,
      projectedSavings: projected,
      availableSavings: available,
      shortfall,
      atRisk,
    });

    claimedByEarlierGoals += cp.fundingNeed;
  }

  return { simulation, checkpoints: results };
}