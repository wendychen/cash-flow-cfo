import { useFinanceStore } from './financeStore';
import type { TimePeriod } from '@/components/shared';

/**
 * Custom hook that provides a clean, ergonomic API over the finance store.
 * This is the recommended way to consume the store in components.
 */
export function useFinance(period?: TimePeriod | null) {
  const store = useFinanceStore();

  const periodObj = period
    ? { startDate: period.startDate, endDate: period.endDate }
    : null;

  return {
    // Raw state (use sparingly — prefer selectors below)
    ...store,

    // ==================== FILTERED DATA (period-aware) ====================
    filteredExpenses: store.getFilteredExpenses(periodObj),
    filteredIncomes: store.getFilteredIncomes(periodObj),
    filteredSavings: store.getFilteredSavings(periodObj),
    filteredFixedExpenses: store.getFilteredFixedExpenses(periodObj),
    filteredGoals: store.getFilteredGoals(periodObj),

    activeGoals: store.getActiveGoals(),
    activeGoalsWithTaskCount: store.getActiveGoalsWithTaskCount(),

    latestSavingsBalance: store.getLatestSavingsBalance(),

    dashboardSummary: store.getDashboardSummary(periodObj),

    expensesByCategory: store.getExpensesByCategory(periodObj),

    // ==================== CONVENIENCE ACTIONS ====================
    toggleExpenseNeedsCheck: store.toggleExpenseNeedsCheck,
  };
}

// Individual selector hooks (great for performance)
export const useActiveGoals = () => useFinanceStore((s) => s.getActiveGoals());
export const useLatestSavingsBalance = () => useFinanceStore((s) => s.getLatestSavingsBalance());
export const useDashboardSummary = (period?: TimePeriod | null) =>
  useFinanceStore((s) =>
    s.getDashboardSummary(period ? { startDate: period.startDate, endDate: period.endDate } : null)
  );
export const useFilteredExpenses = (period?: TimePeriod | null) =>
  useFinanceStore((s) =>
    s.getFilteredExpenses(period ? { startDate: period.startDate, endDate: period.endDate } : null)
  );
