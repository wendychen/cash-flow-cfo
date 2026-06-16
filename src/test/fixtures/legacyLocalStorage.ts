/**
 * Golden fixtures representing legacy per-domain localStorage keys (v1 era).
 * Used to verify migration and re-import behavior.
 */

export const LEGACY_STORAGE_KEYS = [
  'expenses',
  'incomes',
  'savings',
  'fixedExpenses',
  'financialTargets',
  'goals',
  'tasks',
] as const;

export const legacyLocalStorageV1 = {
  expenses: JSON.stringify([
    {
      id: 'exp-1',
      date: '2026-01-15',
      description: 'Goal: Launch Product',
      amount: 5000,
      timeCost: '2 weeks',
      needsCheck: true,
      category: 'business',
      linkedGoalId: 'goal-1',
    },
    {
      id: 'exp-2',
      date: '2026-01-20',
      description: 'Office supplies',
      amount: 120,
      timeCost: '',
      needsCheck: false,
      category: 'misc',
    },
  ]),
  incomes: JSON.stringify([
    {
      id: 'inc-1',
      date: '2026-01-01',
      description: 'Salary',
      amount: 80000,
      category: 'salary',
    },
  ]),
  savings: JSON.stringify([
    {
      id: 'sav-1',
      date: '2026-01-31',
      amount: 25000,
      savingType: 'balance',
      note: 'January balance',
    },
    {
      id: 'sav-2',
      date: '2026-02-01',
      amount: 30000,
      savingType: 'goal',
      note: 'Savings goal',
    },
  ]),
  fixedExpenses: JSON.stringify([
    {
      id: 'fix-1',
      description: 'Rent',
      amount: 15000,
      category: 'housing',
      frequency: 'monthly',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  financialTargets: JSON.stringify([
    {
      id: 'tgt-1',
      type: 'savings',
      amount: 30000,
      currency: 'NTD',
      period: 'monthly',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  goals: JSON.stringify([
    {
      id: 'goal-1',
      title: 'Launch Product',
      deadline: '2026-06-01',
      completed: false,
      isMagicWand: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      linkedExpenseId: 'exp-1',
      category: 'business',
      budget: 5000,
      timeCost: '2 weeks',
      ideations: [],
      constraint: '',
      urlPack: [],
      preTasks: [
        {
          id: 'task-pre-1',
          action: 'Research market',
          cost: 200,
          timeCost: '3 days',
          deadline: '2026-02-01',
          isMagicWand: false,
          completed: false,
          linkedExpenseId: 'exp-task-pre-1',
        },
      ],
      postTasks: [],
      postDreams: [
        {
          id: 'task-dream-1',
          title: 'Become category leader',
          cost: 0,
          timeCost: '',
          deadline: '2026-12-31',
          isMagicWand: false,
        },
      ],
    },
    {
      id: 'goal-2',
      title: 'Simple Goal',
      deadline: '2026-03-01',
      completed: false,
      isMagicWand: false,
      createdAt: '2026-01-05T00:00:00.000Z',
      category: 'misc',
      budget: 0,
      timeCost: '',
      ideations: [],
      constraint: '',
      urlPack: [],
    },
  ]),
  tasks: JSON.stringify([]),
};

/** Partial legacy data — only goals with embedded tasks, other domains empty/missing. */
export const legacyPartialGoalsOnly = {
  goals: legacyLocalStorageV1.goals,
};

/** Expected v2 shape after migrating legacyLocalStorageV1 goals (task counts). */
export const expectedMigrationCounts = {
  goals: 2,
  tasks: 2, // 1 preTask + 1 postDream
  expenses: 2,
  incomes: 1,
  savings: 2,
  fixedExpenses: 1,
  targets: 1,
};