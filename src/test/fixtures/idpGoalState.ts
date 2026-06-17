import { FinanceStateV2 } from '@/stores/finance/financeStore';

/**
 * Fixture mirroring "I have IDP" goal — must keep shadow expense link after round-trip.
 */
export const idpGoalState: FinanceStateV2 = {
  version: 2,
  expenses: [
    {
      id: 'exp-idp',
      date: '2026-12-01',
      description: 'Goal: I have IDP.',
      amount: 0,
      timeCost: '',
      needsCheck: true,
      category: 'misc',
      linkedGoalId: 'goal-idp',
    },
  ],
  incomes: [],
  savings: [],
  fixedExpenses: [],
  targets: [],
  longTermFinGoal: null,
  goals: [
    {
      id: 'goal-idp',
      title: 'I have IDP.',
      deadline: '2026-12-01',
      completed: false,
      isMagicWand: false,
      createdAt: '2026-01-15T00:00:00.000Z',
      linkedExpenseId: 'exp-idp',
      category: 'misc',
      budget: 0,
      timeCost: '',
      ideations: [{ id: 'idea-1', content: 'Study plan', createdAt: '2026-01-15T00:00:00.000Z' }],
      constraint: '',
      urlPack: [],
    },
  ],
  tasks: [
    {
      id: 'task-idp-1',
      goalId: 'goal-idp',
      parentId: null,
      taskType: 'pre',
      sortOrder: 0,
      title: 'Apply for IDP',
      cost: 500,
      timeCost: '2 weeks',
      deadline: '2026-06-01',
      isMagicWand: false,
      completed: false,
      linkedExpenseId: 'exp-task-idp',
      createdAt: '2026-01-15T00:00:00.000Z',
    },
  ],
};

// Add linked task expense (after initial definition for readability)
idpGoalState.expenses.push({
  id: 'exp-task-idp',
  date: '2026-06-01',
  description: '[Pre-task] Apply for IDP',
  amount: 500,
  timeCost: '2 weeks',
  needsCheck: false,
  category: 'misc',
  linkedGoalId: 'goal-idp',
  linkedTaskId: 'task-idp-1',
  linkedTaskType: 'pre',
});