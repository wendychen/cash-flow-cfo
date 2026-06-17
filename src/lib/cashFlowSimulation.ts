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