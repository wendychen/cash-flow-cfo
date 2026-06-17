import { FinanceStateV2 } from '@/stores/finance/financeStore';

export const emptyFinanceState: FinanceStateV2 = {
  version: 2,
  expenses: [],
  incomes: [],
  savings: [],
  fixedExpenses: [],
  targets: [],
  longTermFinGoal: null,
  goals: [],
  tasks: [],
};

/** Reset a Zustand finance store to a known baseline between tests. */
export function resetFinanceStore(
  store: { setState: (partial: Partial<FinanceStateV2>) => void },
  overrides: Partial<FinanceStateV2> = {}
) {
  // Merge — do not use replace:true or store actions are stripped from getState()
  store.setState({ ...emptyFinanceState, ...overrides });
}