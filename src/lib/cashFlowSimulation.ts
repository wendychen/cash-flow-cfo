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
}

export interface SimulationResult {
  months: SimulationMonth[];
  totalNet: number;
  endingSavings: number;
  baselineEndingSavings: number;
  savingsDelta: number;
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

  for (let m = 1; m <= months; m++) {
    const income = monthlyIncome + incomeChange;
    const expenses = Math.max(0, monthlyExpenses + expenseChange);
    const net = income - expenses;
    cumulative += net;

    const baselineNet = monthlyIncome - monthlyExpenses;
    baselineCumulative += baselineNet;

    monthsData.push({
      month: m,
      income,
      expenses,
      net,
      cumulativeSavings: cumulative,
    });
  }

  return {
    months: monthsData,
    totalNet: monthsData.reduce((sum, row) => sum + row.net, 0),
    endingSavings: cumulative,
    baselineEndingSavings: baselineCumulative,
    savingsDelta: cumulative - baselineCumulative,
  };
}