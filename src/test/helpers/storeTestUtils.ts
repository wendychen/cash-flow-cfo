import { FinanceStateV2 } from '@/stores/finance/financeStore';

export const emptyFinanceState: FinanceStateV2 = {
  version: 2,
  expenses: [],
  incomes: [],
  savings: [],
  fixedExpenses: [],
  targets: [],
  goals: [],
  tasks: [],
};

/** Reset a Zustand finance store to a known baseline between tests. */
export function resetFinanceStore(
  store: { setState: (partial: Partial<FinanceStateV2>, replace?: boolean) => void },
  overrides: Partial<FinanceStateV2> = {}
) {
  store.setState({ ...emptyFinanceState, ...overrides }, true);
}