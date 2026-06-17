import { addMonths, format } from 'date-fns';
import type { Expense } from '@/types/expense';
import type { Income } from '@/types/income';
import type { Saving } from '@/types/saving';
import type { FixedExpense } from '@/types/fixedExpense';
import { getMonthlyEquivalent } from '@/types/fixedExpense';
import { parseLocalDate } from '@/lib/date';

export interface MonthSummaryData {
  month: string;
  displayMonth: string;
  totalIncome: number;
  totalExpenses: number;
  fixedExpensesMonthly: number;
  savingsBalance: number | null;
  netFlow: number;
  isPrediction: boolean;
  isCurrentMonth: boolean;
}

export interface MonthlySummaryInput {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
  showPredictions?: boolean;
  now?: Date;
  locale?: string;
}

export interface HistoricalAverages {
  avgIncome: number;
  avgExpenses: number;
  avgSavingsGrowth: number;
  latestSavings: number | null;
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  ja: 'ja-JP',
};

export function getCurrentMonthKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthDisplay(monthKey: string, locale = 'en'): string {
  const [year, monthNum] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
  const resolved = LOCALE_MAP[locale] ?? locale;
  return date.toLocaleDateString(resolved, { month: 'long', year: 'numeric' });
}

export function computeFixedExpensesMonthly(fixedExpenses: FixedExpense[]): number {
  return fixedExpenses
    .filter((exp) => exp.isActive)
    .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount, exp.frequency), 0);
}

function monthKeyFromDate(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function latestBalanceForMonth(monthSavings: Saving[]): number {
  const sorted = [...monthSavings].sort(
    (a, b) => (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0)
  );
  return sorted[0]?.amount ?? 0;
}

export function computeHistoricalAverages(
  input: Pick<MonthlySummaryInput, 'expenses' | 'incomes' | 'savings' | 'now'>
): HistoricalAverages {
  const now = input.now ?? new Date();
  const currentMonth = getCurrentMonthKey(now);

  const pastMonthsIncome = new Map<string, number>();
  const pastMonthsExpenses = new Map<string, number>();
  const savingsBalances: { month: string; balance: number }[] = [];

  input.incomes.forEach((inc) => {
    const month = monthKeyFromDate(inc.date);
    if (month < currentMonth) {
      pastMonthsIncome.set(month, (pastMonthsIncome.get(month) || 0) + inc.amount);
    }
  });

  input.expenses.forEach((exp) => {
    const month = monthKeyFromDate(exp.date);
    if (month < currentMonth) {
      pastMonthsExpenses.set(month, (pastMonthsExpenses.get(month) || 0) + exp.amount);
    }
  });

  const savingsByMonth = new Map<string, Saving[]>();
  input.savings.forEach((sav) => {
    const month = monthKeyFromDate(sav.date);
    if (!savingsByMonth.has(month)) savingsByMonth.set(month, []);
    savingsByMonth.get(month)!.push(sav);
  });

  savingsByMonth.forEach((monthSavings, month) => {
    savingsBalances.push({ month, balance: latestBalanceForMonth(monthSavings) });
  });
  savingsBalances.sort((a, b) => a.month.localeCompare(b.month));

  const incomeValues = Array.from(pastMonthsIncome.values());
  const expenseValues = Array.from(pastMonthsExpenses.values());

  const avgIncome =
    incomeValues.length > 0
      ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length
      : 0;

  const avgExpenses =
    expenseValues.length > 0
      ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
      : 0;

  let avgSavingsGrowth = 0;
  if (savingsBalances.length >= 2) {
    const growths: number[] = [];
    for (let i = 1; i < savingsBalances.length; i++) {
      growths.push(savingsBalances[i].balance - savingsBalances[i - 1].balance);
    }
    avgSavingsGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
  }

  const latestSavings =
    savingsBalances.length > 0
      ? savingsBalances[savingsBalances.length - 1].balance
      : null;

  return { avgIncome, avgExpenses, avgSavingsGrowth, latestSavings };
}

export function buildPredictionMonths(
  averages: HistoricalAverages,
  fixedExpensesMonthly: number,
  options: { showPredictions: boolean; now?: Date; locale?: string; monthsAhead?: number }
): MonthSummaryData[] {
  if (!options.showPredictions) return [];

  const now = options.now ?? new Date();
  const locale = options.locale ?? 'en';
  const monthsAhead = options.monthsAhead ?? 3;
  const { avgIncome, avgExpenses, avgSavingsGrowth, latestSavings } = averages;

  const predictions: MonthSummaryData[] = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const future = addMonths(now, i);
    const month = format(future, 'yyyy-MM');
    const displayMonth = formatMonthDisplay(month, locale);
    const predictedSavings =
      latestSavings !== null ? latestSavings + avgSavingsGrowth * i : null;

    predictions.push({
      month,
      displayMonth,
      totalIncome: avgIncome,
      totalExpenses: avgExpenses,
      fixedExpensesMonthly,
      savingsBalance: predictedSavings,
      netFlow: avgIncome - avgExpenses - fixedExpensesMonthly,
      isPrediction: true,
      isCurrentMonth: false,
    });
  }

  return predictions;
}

export function buildMonthlySummaryData(input: MonthlySummaryInput): MonthSummaryData[] {
  const now = input.now ?? new Date();
  const locale = input.locale ?? 'en';
  const currentMonth = getCurrentMonthKey(now);
  const fixedExpensesMonthly = computeFixedExpensesMonthly(input.fixedExpenses);
  const averages = computeHistoricalAverages(input);

  const predictionMonths = buildPredictionMonths(averages, fixedExpensesMonthly, {
    showPredictions: !!input.showPredictions,
    now,
    locale,
  });

  const allMonths = new Set<string>();
  allMonths.add(currentMonth);

  input.expenses.forEach((exp) => allMonths.add(monthKeyFromDate(exp.date)));
  input.incomes.forEach((inc) => allMonths.add(monthKeyFromDate(inc.date)));
  input.savings.forEach((sav) => allMonths.add(monthKeyFromDate(sav.date)));

  const monthMap = new Map<string, MonthSummaryData>();

  allMonths.forEach((month) => {
    monthMap.set(month, {
      month,
      displayMonth: formatMonthDisplay(month, locale),
      totalIncome: 0,
      totalExpenses: 0,
      fixedExpensesMonthly,
      savingsBalance: null,
      netFlow: 0,
      isPrediction: false,
      isCurrentMonth: month === currentMonth,
    });
  });

  input.incomes.forEach((inc) => {
    const data = monthMap.get(monthKeyFromDate(inc.date));
    if (data) data.totalIncome += inc.amount;
  });

  input.expenses.forEach((exp) => {
    const data = monthMap.get(monthKeyFromDate(exp.date));
    if (data) data.totalExpenses += exp.amount;
  });

  const savingsByMonth = new Map<string, Saving[]>();
  input.savings.forEach((sav) => {
    const month = monthKeyFromDate(sav.date);
    if (!savingsByMonth.has(month)) savingsByMonth.set(month, []);
    savingsByMonth.get(month)!.push(sav);
  });

  savingsByMonth.forEach((monthSavings, month) => {
    const data = monthMap.get(month);
    if (data) data.savingsBalance = latestBalanceForMonth(monthSavings);
  });

  monthMap.forEach((data) => {
    data.netFlow = data.totalIncome - data.totalExpenses - data.fixedExpensesMonthly;
  });

  const actualMonths = Array.from(monthMap.values());
  actualMonths.sort((a, b) => {
    if (a.isCurrentMonth && !b.isCurrentMonth) return -1;
    if (!a.isCurrentMonth && b.isCurrentMonth) return 1;
    return b.month.localeCompare(a.month);
  });

  const sortedPredictions = [...predictionMonths].sort((a, b) =>
    b.month.localeCompare(a.month)
  );

  return [...sortedPredictions, ...actualMonths];
}