import { useMemo } from 'react';
import { useFinanceStore } from './financeStore';
import type { TimePeriod } from '@/types/timePeriod';
import type { DatePeriod } from '@/lib/date';

function toPeriodObj(period?: TimePeriod | null): DatePeriod | null {
  if (!period) return null;
  return { startDate: period.startDate, endDate: period.endDate };
}

function periodKey(period?: TimePeriod | null): string {
  if (!period) return 'all';
  return [
    period.type,
    period.year,
    period.quarter ?? '',
    period.month ?? '',
    period.week ?? '',
    period.startDate.getTime(),
    period.endDate.getTime(),
  ].join('|');
}

/**
 * Period-aware finance data. Subscribes to underlying store slices and
 * recomputes filtered collections when either data or selectedPeriod changes.
 */
export function useFinance(period?: TimePeriod | null) {
  const periodObj = useMemo(() => toPeriodObj(period), [periodKey(period)]);

  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const savings = useFinanceStore((s) => s.savings);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const goals = useFinanceStore((s) => s.goals);
  const tasks = useFinanceStore((s) => s.tasks);

  const filteredExpenses = useMemo(
    () => useFinanceStore.getState().getFilteredExpenses(periodObj),
    [expenses, periodObj]
  );

  const filteredIncomes = useMemo(
    () => useFinanceStore.getState().getFilteredIncomes(periodObj),
    [incomes, periodObj]
  );

  const filteredSavings = useMemo(
    () => useFinanceStore.getState().getFilteredSavings(periodObj),
    [savings, periodObj]
  );

  const filteredFixedExpenses = useMemo(
    () => useFinanceStore.getState().getFilteredFixedExpenses(periodObj),
    [fixedExpenses, periodObj]
  );

  const filteredGoals = useMemo(
    () => useFinanceStore.getState().getFilteredGoals(periodObj),
    [goals, periodObj]
  );

  const activeGoals = useMemo(
    () => useFinanceStore.getState().getActiveGoals(),
    [goals]
  );

  const activeGoalsWithTaskCount = useMemo(
    () => useFinanceStore.getState().getActiveGoalsWithTaskCount(),
    [goals, tasks]
  );

  const latestSavingsBalance = useMemo(
    () => useFinanceStore.getState().getLatestSavingsBalance(),
    [savings]
  );

  const dashboardSummary = useMemo(
    () => useFinanceStore.getState().getDashboardSummary(periodObj),
    [expenses, incomes, savings, goals, tasks, periodObj]
  );

  const expensesByCategory = useMemo(
    () => useFinanceStore.getState().getExpensesByCategory(periodObj),
    [expenses, periodObj]
  );

  const toggleExpenseNeedsCheck = useFinanceStore((s) => s.toggleExpenseNeedsCheck);

  return {
    filteredExpenses,
    filteredIncomes,
    filteredSavings,
    filteredFixedExpenses,
    filteredGoals,
    activeGoals,
    activeGoalsWithTaskCount,
    latestSavingsBalance,
    dashboardSummary,
    expensesByCategory,
    toggleExpenseNeedsCheck,
  };
}

// Individual selector hooks (great for performance)
export const useActiveGoals = () => useFinanceStore((s) => s.getActiveGoals());
export const useLatestSavingsBalance = () => useFinanceStore((s) => s.getLatestSavingsBalance());
export const useDashboardSummary = (period?: TimePeriod | null) => {
  const periodObj = useMemo(() => toPeriodObj(period), [periodKey(period)]);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const savings = useFinanceStore((s) => s.savings);
  const goals = useFinanceStore((s) => s.goals);
  const tasks = useFinanceStore((s) => s.tasks);

  return useMemo(
    () => useFinanceStore.getState().getDashboardSummary(periodObj),
    [expenses, incomes, savings, goals, tasks, periodObj]
  );
};

export const useFilteredExpenses = (period?: TimePeriod | null) => {
  const periodObj = useMemo(() => toPeriodObj(period), [periodKey(period)]);
  const expenses = useFinanceStore((s) => s.expenses);

  return useMemo(
    () => useFinanceStore.getState().getFilteredExpenses(periodObj),
    [expenses, periodObj]
  );
};