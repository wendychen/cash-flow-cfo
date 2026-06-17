import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Currency } from '@/hooks/use-currency';
import {
  backfillShadowExpensesForGoals,
  collectExpenseIdsForGoalDelete,
  createGoalShadowExpense,
  createTaskShadowExpense,
  mapExpenseUpdatesToGoal,
  mapExpenseUpdatesToTask,
  mapGoalUpdatesToExpense,
  mapTaskUpdatesToExpense,
} from '@/lib/domain/goalExpenseSync';
import {
  shouldSyncTargetFromSaving,
  syncSavingsGoalFromTarget,
  targetAmountFromSaving,
} from '@/lib/domain/savingsTargetSync';
import { isDateInPeriod } from '@/lib/date';
import { Expense } from '@/types/expense';
import { Income } from '@/types/income';
import { Saving } from '@/types/saving';
import { FixedExpense } from '@/types/fixedExpense';
import { Goal } from '@/types/goal';
import { TaskNode } from '@/types/task';
import { FinancialTarget } from '@/types/target';
import { sortTasksForImport } from '@/lib/goalExport';
import { buildDuplicatedTasksForCycle, buildNextCycleGoalFields } from '@/lib/goalRepeat';
import { isRepeatingGoal, normalizeRepeatInterval } from '@/types/goalRepeat';
import {
  buildAccruedCollectionIncome,
  validateAccruedAmountUpdate,
  validateCollectionAmount,
} from '@/lib/incomeConversion';
import { migratePersistedState } from './migration';

/**
 * Versioned storage shape for the entire application.
 * v2 = Normalized model (goals + tasks are separate arrays)
 */
export interface FinanceStateV2 {
  version: 2;
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
  targets: FinancialTarget[];
  goals: Goal[];
  tasks: TaskNode[];
}

/**
 * Legacy shape (v1) from before the refactor.
 * We keep this type only for migration purposes.
 */
export interface FinanceStateV1 {
  version?: 1;
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
  targets: FinancialTarget[];
  goals: any[];   // old shape with possible embedded tasks
  tasks?: TaskNode[];
  // other legacy fields may exist
}

export type FinanceState = FinanceStateV2;

interface FinanceStore extends FinanceState {
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => void;
  deleteExpense: (id: string) => void;

  // Income actions
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, updates: Partial<Omit<Income, 'id'>>) => void;
  deleteIncome: (id: string) => void;
  recordAccruedCollection: (
    accruedIncomeId: string,
    collection: { date: string; amount: number; note?: string }
  ) => string | null;

  // Saving actions
  addSaving: (saving: Omit<Saving, 'id'>, displayCurrency?: Currency) => void;
  updateSaving: (id: string, updates: Partial<Omit<Saving, 'id'>>, displayCurrency?: Currency) => void;
  deleteSaving: (id: string) => void;

  // Fixed Expense actions
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => void;
  updateFixedExpense: (id: string, updates: Partial<Omit<FixedExpense, 'id'>>) => void;
  deleteFixedExpense: (id: string) => void;

  // Goal actions (normalized)
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (orderedIds: string[]) => void;
  importGoalBundle: (bundle: { goal: Goal; tasks: TaskNode[] }) => string;
  spawnRepeatingGoalCycle: (goalId: string) => string | null;

  // Task actions (normalized - single source of truth)
  addTask: (task: Omit<TaskNode, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Omit<TaskNode, 'id'>>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (goalId: string, taskType: TaskNode['taskType'], orderedIds: string[]) => void;
  moveTask: (taskId: string, newParentId: string | null) => void;

  // Target actions
  setTarget: (
    type: FinancialTarget['type'],
    amount: number,
    period: FinancialTarget['period'],
    currency: Currency,
    skipSavingSync?: boolean
  ) => void;

  // Utility
  resetAllData: () => void;
  replaceAllData: (newState: FinanceStateV2) => void;
  backfillMissingShadowExpenses: () => void;
  _runMigrationIfNeeded: () => void; // internal

  // Computed getters (recommended way to access derived state)
  getActiveGoals: () => Goal[];
  getLatestSavingsBalance: () => number;
  getFilteredExpenses: (period: { startDate: Date; endDate: Date } | null) => Expense[];
  getTotalIncome: () => number;
  getTotalExpenses: (period?: { startDate: Date; endDate: Date } | null) => number;
  getTotalSavings: () => number;
  getActiveGoalsWithTaskCount: () => Array<Goal & { taskCount: number }>;
  getExpensesByCategory: (period?: { startDate: Date; endDate: Date } | null) => Record<string, number>;
  getDashboardSummary: (period?: { startDate: Date; endDate: Date } | null) => {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    activeGoalsCount: number;
    totalTasks: number;
    latestSavingsBalance: number;
  };

  // Domain actions (higher level than raw CRUD)
  toggleExpenseNeedsCheck: (id: string) => void;

  // New filtered getters
  getFilteredIncomes: (period?: { startDate: Date; endDate: Date } | null) => Income[];
  getFilteredSavings: (period?: { startDate: Date; endDate: Date } | null) => Saving[];
  getFilteredFixedExpenses: (period?: { startDate: Date; endDate: Date } | null) => FixedExpense[];
  getFilteredGoals: (period?: { startDate: Date; endDate: Date } | null) => Goal[];
  getFilteredTasksForGoals: (goalIds: string[]) => TaskNode[];
}

const initialState: FinanceStateV2 = {
  version: 2,
  expenses: [],
  incomes: [],
  savings: [],
  fixedExpenses: [],
  targets: [],
  goals: [],
  tasks: [],
};

// Safe default for migration
const emptyV1: FinanceStateV1 = {
  version: 1,
  expenses: [],
  incomes: [],
  savings: [],
  fixedExpenses: [],
  targets: [],
  goals: [],
  tasks: [],
};

// Core import logic (can be called manually too)
export function reimportOldData() {
  const newStorageKey = 'cash-flow-cfo-storage';

  console.log('[Store] Starting manual re-import of old data...');

  try {
    const oldData = {
      expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
      incomes: JSON.parse(localStorage.getItem('incomes') || '[]'),
      savings: JSON.parse(localStorage.getItem('savings') || '[]'),
      fixedExpenses: JSON.parse(localStorage.getItem('fixedExpenses') || '[]'),
      targets: JSON.parse(localStorage.getItem('financialTargets') || '[]'),
      goals: JSON.parse(localStorage.getItem('goals') || '[]'),
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      version: 1,
    };

    const migrated = migratePersistedState(oldData, 1);

    // Overwrite the new storage with migrated data
    localStorage.setItem(newStorageKey, JSON.stringify({
      state: migrated,
      version: 2,
    }));

    console.log('[Store] Re-import completed successfully.');
    return { success: true, message: 'Old data imported successfully!' };
  } catch (e) {
    console.error('[Store] Re-import failed:', e);
    return { success: false, message: 'Failed to import old data. Check console.' };
  }
}

// Helper that runs automatically on first load
function importOldDataIfNeeded() {
  const newStorageKey = 'cash-flow-cfo-storage';
  const hasNewData = localStorage.getItem(newStorageKey);

  if (hasNewData) return;

  const oldKeys = ['expenses', 'incomes', 'savings', 'fixedExpenses', 'targets', 'goals', 'tasks'];
  const hasOldData = oldKeys.some(key => localStorage.getItem(key));

  if (!hasOldData) return;

  console.log('[Store] Old data detected on first load. Auto-importing...');
  reimportOldData();
}

// Run on module load
importOldDataIfNeeded();

function createNextCycleGoalFromSource(
  source: Goal,
  overrides?: Partial<Goal>
): { goal: Goal; expense: Expense } | null {
  const fields = buildNextCycleGoalFields({ ...source, ...overrides });
  if (!fields) return null;

  const goalId = crypto.randomUUID();
  const { expense, expenseId } = createGoalShadowExpense(goalId, {
    title: fields.title,
    deadline: fields.deadline,
    category: fields.category || 'misc',
    budget: fields.budget ?? 0,
    timeCost: fields.timeCost ?? '',
  });

  const goal: Goal = {
    ...fields,
    id: goalId,
    createdAt: new Date().toISOString(),
    linkedExpenseId: expenseId,
  };

  return { goal, expense };
}

interface SpawnedCycleBundle {
  goal: Goal;
  goalExpense: Expense;
  tasks: TaskNode[];
  taskExpenses: Expense[];
}

function spawnRepeatingCycleBundle(
  source: Goal,
  sourceTasks: TaskNode[],
  overrides?: Partial<Goal>
): SpawnedCycleBundle | null {
  const spawned = createNextCycleGoalFromSource(source, overrides);
  if (!spawned) return null;

  const interval = normalizeRepeatInterval(source.repeatInterval);
  const duplicated = buildDuplicatedTasksForCycle(
    sourceTasks,
    source.id,
    spawned.goal.id,
    interval
  );

  const taskExpenses: Expense[] = [];
  const tasks = duplicated.map((task) => {
    const { expense, expenseId } = createTaskShadowExpense(
      spawned.goal.id,
      task.id,
      task.taskType,
      {
        title: task.title,
        cost: task.cost,
        timeCost: task.timeCost,
        deadline: task.deadline,
      },
      spawned.goal.category
    );
    taskExpenses.push(expense);
    return { ...task, linkedExpenseId: expenseId };
  });

  return {
    goal: spawned.goal,
    goalExpense: spawned.expense,
    tasks,
    taskExpenses,
  };
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ==================== EXPENSES ====================
      addExpense: (expense) => {
        const newExpense: Expense = { ...expense, id: crypto.randomUUID() };
        set((state) => ({ expenses: [newExpense, ...state.expenses] }));
      },
      updateExpense: (id, updates) => {
        set((state) => {
          const expense = state.expenses.find((e) => e.id === id);
          if (!expense) return state;

          const nextExpenses = state.expenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          );
          let nextGoals = state.goals;
          let nextTasks = state.tasks;

          if (expense.linkedGoalId && !expense.linkedTaskId) {
            const goalUpdates = mapExpenseUpdatesToGoal(updates);
            if (Object.keys(goalUpdates).length > 0) {
              nextGoals = state.goals.map((g) =>
                g.id === expense.linkedGoalId ? { ...g, ...goalUpdates } : g
              );
            }
          }

          if (expense.linkedGoalId && expense.linkedTaskId) {
            const taskUpdates = mapExpenseUpdatesToTask(expense, updates);
            if (Object.keys(taskUpdates).length > 0) {
              nextTasks = state.tasks.map((t) =>
                t.id === expense.linkedTaskId ? { ...t, ...taskUpdates } : t
              );
            }
          }

          return { expenses: nextExpenses, goals: nextGoals, tasks: nextTasks };
        });
      },
      deleteExpense: (id) => {
        set((state) => {
          const expense = state.expenses.find((e) => e.id === id);
          const nextExpenses = state.expenses.filter((e) => e.id !== id);

          if (!expense?.linkedTaskId) {
            return { expenses: nextExpenses };
          }

          const task = state.tasks.find((t) => t.id === expense.linkedTaskId);
          if (!task) {
            return { expenses: nextExpenses };
          }

          const nextTasks = state.tasks
            .map((t) =>
              t.parentId === expense.linkedTaskId
                ? { ...t, parentId: task.parentId }
                : t
            )
            .filter((t) => t.id !== expense.linkedTaskId);

          return { expenses: nextExpenses, tasks: nextTasks };
        });
      },

      // ==================== INCOMES ====================
      addIncome: (income) => {
        const newIncome: Income = { ...income, id: crypto.randomUUID() };
        set((state) => ({ incomes: [newIncome, ...state.incomes] }));
      },
      updateIncome: (id, updates) => {
        set((state) => {
          const income = state.incomes.find((i) => i.id === id);
          if (!income) return state;

          if (
            income.incomeType === 'accrued' &&
            updates.amount !== undefined &&
            updates.amount !== income.amount
          ) {
            const check = validateAccruedAmountUpdate(income, updates.amount, state.incomes);
            if (!check.valid) return state;
          }

          return {
            incomes: state.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
          };
        });
      },
      deleteIncome: (id) => {
        set((state) => ({
          incomes: state.incomes.filter(
            (i) => i.id !== id && i.linkedAccruedIncomeId !== id
          ),
        }));
      },
      recordAccruedCollection: (accruedIncomeId, collection) => {
        const state = get();
        const accrued = state.incomes.find(
          (i) => i.id === accruedIncomeId && i.incomeType === 'accrued'
        );
        if (!accrued) return null;

        const check = validateCollectionAmount(accrued, collection.amount, state.incomes);
        if (!check.valid) return null;

        const newIncome: Income = {
          ...buildAccruedCollectionIncome(accrued, collection),
          id: crypto.randomUUID(),
        };

        set((current) => ({ incomes: [newIncome, ...current.incomes] }));
        return newIncome.id;
      },

      // ==================== SAVINGS ====================
      addSaving: (saving, displayCurrency = 'NTD') => {
        const newSaving: Saving = { ...saving, id: crypto.randomUUID() };
        set((state) => {
          const nextSavings = [newSaving, ...state.savings];
          if (saving.savingType !== 'goal') {
            return { savings: nextSavings };
          }

          const amount = targetAmountFromSaving(saving, displayCurrency);
          const now = new Date().toISOString();
          const existingIndex = state.targets.findIndex(
            (t) => t.type === 'savings' && t.period === 'monthly' && t.currency === displayCurrency
          );
          const nextTargets =
            existingIndex >= 0
              ? state.targets.map((t, i) =>
                  i === existingIndex ? { ...t, amount, updatedAt: now } : t
                )
              : [
                  ...state.targets,
                  {
                    id: crypto.randomUUID(),
                    type: 'savings' as const,
                    amount,
                    currency: displayCurrency,
                    period: 'monthly' as const,
                    createdAt: now,
                    updatedAt: now,
                  },
                ];

          return { savings: nextSavings, targets: nextTargets };
        });
      },
      updateSaving: (id, updates, displayCurrency = 'NTD') => {
        set((state) => {
          const existing = state.savings.find((s) => s.id === id);
          const nextSavings = state.savings.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          );

          if (!shouldSyncTargetFromSaving(existing, updates)) {
            return { savings: nextSavings };
          }

          const merged = { ...existing, ...updates } as Saving;
          const amount = targetAmountFromSaving(merged, displayCurrency);
          const now = new Date().toISOString();
          const existingIndex = state.targets.findIndex(
            (t) => t.type === 'savings' && t.period === 'monthly' && t.currency === displayCurrency
          );
          const nextTargets =
            existingIndex >= 0
              ? state.targets.map((t, i) =>
                  i === existingIndex ? { ...t, amount, updatedAt: now } : t
                )
              : [
                  ...state.targets,
                  {
                    id: crypto.randomUUID(),
                    type: 'savings' as const,
                    amount,
                    currency: displayCurrency,
                    period: 'monthly' as const,
                    createdAt: now,
                    updatedAt: now,
                  },
                ];

          return { savings: nextSavings, targets: nextTargets };
        });
      },
      deleteSaving: (id) => {
        set((state) => ({ savings: state.savings.filter((s) => s.id !== id) }));
      },

      // ==================== FIXED EXPENSES ====================
      addFixedExpense: (expense) => {
        const newFixed: FixedExpense = { ...expense, id: crypto.randomUUID() };
        set((state) => ({ fixedExpenses: [...state.fixedExpenses, newFixed] }));
      },
      updateFixedExpense: (id, updates) => {
        set((state) => ({
          fixedExpenses: state.fixedExpenses.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }));
      },
      deleteFixedExpense: (id) => {
        set((state) => ({
          fixedExpenses: state.fixedExpenses.filter((f) => f.id !== id),
        }));
      },

      toggleExpenseNeedsCheck: (id) => {
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, needsCheck: !e.needsCheck } : e
          ),
        }));
      },

      // ==================== GOALS (Normalized) ====================
      addGoal: (goal) => {
        const goalId = crypto.randomUUID();
        const { expense, expenseId } = createGoalShadowExpense(goalId, {
          title: goal.title,
          deadline: goal.deadline,
          category: goal.category || 'misc',
          budget: goal.budget ?? 0,
          timeCost: goal.timeCost ?? '',
        });

        const newGoal: Goal = {
          ...goal,
          id: goalId,
          createdAt: new Date().toISOString(),
          ideations: goal.ideations || [],
          urlPack: goal.urlPack || [],
          milestones: goal.milestones || [],
          linkedExpenseId: expenseId,
          category: goal.category || 'misc',
        };

        set((state) => ({
          goals: [...state.goals, newGoal],
          expenses: [...state.expenses, expense],
        }));
      },
      updateGoal: (id, updates) => {
        set((state) => {
          const goal = state.goals.find((g) => g.id === id);
          if (!goal) return state;

          const nextGoals = state.goals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          );
          let nextExpenses = state.expenses;

          if (goal.linkedExpenseId) {
            const expenseUpdates = mapGoalUpdatesToExpense(updates);
            if (Object.keys(expenseUpdates).length > 0) {
              nextExpenses = state.expenses.map((e) =>
                e.id === goal.linkedExpenseId ? { ...e, ...expenseUpdates } : e
              );
            }
          }

          if (updates.category) {
            nextExpenses = nextExpenses.map((e) =>
              e.linkedGoalId === id ? { ...e, category: updates.category! } : e
            );
          }

          const isCompleting = updates.completed === true && !goal.completed;
          let spawnedGoals: Goal[] = [];
          let spawnedExpenses: Expense[] = [];
          let spawnedTasks: TaskNode[] = [];

          if (isCompleting && isRepeatingGoal(goal.repeatInterval)) {
            const bundle = spawnRepeatingCycleBundle(goal, state.tasks, updates);
            if (bundle) {
              spawnedGoals = [bundle.goal];
              spawnedExpenses = [bundle.goalExpense, ...bundle.taskExpenses];
              spawnedTasks = bundle.tasks;
            }
          }

          return {
            goals: [...nextGoals, ...spawnedGoals],
            expenses: [...nextExpenses, ...spawnedExpenses],
            tasks: [...state.tasks, ...spawnedTasks],
          };
        });
      },
      deleteGoal: (id) => {
        set((state) => {
          const goal = state.goals.find((g) => g.id === id);
          const goalTasks = state.tasks.filter((t) => t.goalId === id);
          const expenseIdsToDelete = collectExpenseIdsForGoalDelete(goal, goalTasks);

          return {
            goals: state.goals.filter((g) => g.id !== id),
            tasks: state.tasks.filter((t) => t.goalId !== id),
            expenses: state.expenses.filter((e) => !expenseIdsToDelete.includes(e.id)),
          };
        });
      },
      reorderGoals: (orderedIds) => {
        set((state) => {
          const goalMap = new Map(state.goals.map(g => [g.id, g]));
          const reordered = orderedIds
            .map(id => goalMap.get(id))
            .filter(Boolean) as Goal[];
          return { goals: reordered };
        });
      },
      importGoalBundle: (bundle) => {
        const goalId = crypto.randomUUID();
        const { expense, expenseId } = createGoalShadowExpense(goalId, {
          title: bundle.goal.title,
          deadline: bundle.goal.deadline,
          category: bundle.goal.category || 'misc',
          budget: bundle.goal.budget ?? 0,
          timeCost: bundle.goal.timeCost ?? '',
        });

        const newGoal: Goal = {
          ...bundle.goal,
          id: goalId,
          createdAt: new Date().toISOString(),
          linkedExpenseId: expenseId,
          ideations: bundle.goal.ideations ?? [],
          urlPack: bundle.goal.urlPack ?? [],
          milestones: bundle.goal.milestones ?? [],
        };

        const taskIdMap = new Map<string, string>();
        const newTasks: TaskNode[] = [];
        const newExpenses: Expense[] = [expense];
        const sorted = sortTasksForImport(bundle.tasks);

        for (const task of sorted) {
          const taskId = crypto.randomUUID();
          taskIdMap.set(task.id, taskId);
          const parentId = task.parentId ? taskIdMap.get(task.parentId) ?? null : null;

          const { expense: taskExpense, expenseId: taskExpenseId } = createTaskShadowExpense(
            goalId,
            taskId,
            task.taskType,
            {
              title: task.title,
              cost: task.cost,
              timeCost: task.timeCost,
              deadline: task.deadline,
            },
            newGoal.category
          );

          newTasks.push({
            ...task,
            id: taskId,
            goalId,
            parentId,
            linkedExpenseId: taskExpenseId,
            createdAt: new Date().toISOString(),
          });
          newExpenses.push(taskExpense);
        }

        set((state) => ({
          goals: [...state.goals, newGoal],
          tasks: [...state.tasks, ...newTasks],
          expenses: [...state.expenses, ...newExpenses],
        }));

        return goalId;
      },
      spawnRepeatingGoalCycle: (goalId) => {
        const state = get();
        const source = state.goals.find((g) => g.id === goalId);
        if (!source) return null;

        const bundle = spawnRepeatingCycleBundle(source, state.tasks);
        if (!bundle) return null;

        set((current) => ({
          goals: [...current.goals, bundle.goal],
          expenses: [...current.expenses, bundle.goalExpense, ...bundle.taskExpenses],
          tasks: [...current.tasks, ...bundle.tasks],
        }));

        return bundle.goal.id;
      },

      // ==================== TASKS (Normalized - Single Source of Truth) ====================
      addTask: (task) => {
        const state = get();
        const goal = state.goals.find((g) => g.id === task.goalId);
        const siblings = state.tasks.filter(
          (t) =>
            t.goalId === task.goalId &&
            t.taskType === task.taskType &&
            t.parentId === task.parentId
        );
        const nextSortOrder = task.sortOrder ?? siblings.length;
        const taskId = crypto.randomUUID();

        const { expense, expenseId } = createTaskShadowExpense(
          task.goalId,
          taskId,
          task.taskType,
          {
            title: task.title,
            cost: task.cost,
            timeCost: task.timeCost,
            deadline: task.deadline,
          },
          goal?.category || 'misc'
        );

        const newTask: TaskNode = {
          ...task,
          sortOrder: nextSortOrder,
          id: taskId,
          createdAt: new Date().toISOString(),
          linkedExpenseId: expenseId,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
          expenses: [...state.expenses, expense],
        }));
      },
      updateTask: (id, updates) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          if (!task) return state;

          const nextTasks = state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          );
          let nextExpenses = state.expenses;

          if (task.linkedExpenseId) {
            const expenseUpdates = mapTaskUpdatesToExpense(task, updates);
            if (Object.keys(expenseUpdates).length > 0) {
              nextExpenses = state.expenses.map((e) =>
                e.id === task.linkedExpenseId ? { ...e, ...expenseUpdates } : e
              );
            }
          }

          return { tasks: nextTasks, expenses: nextExpenses };
        });
      },
      deleteTask: (id) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          if (!task) return state;

          const nextTasks = state.tasks
            .map((t) => (t.parentId === id ? { ...t, parentId: task.parentId } : t))
            .filter((t) => t.id !== id);

          const nextExpenses = task.linkedExpenseId
            ? state.expenses.filter((e) => e.id !== task.linkedExpenseId)
            : state.expenses;

          return { tasks: nextTasks, expenses: nextExpenses };
        });
      },
      reorderTasks: (goalId, taskType, orderedIds) => {
        set((state) => {
          const otherTasks = state.tasks.filter(
            (t) => !(t.goalId === goalId && t.taskType === taskType)
          );
          const reordered = orderedIds
            .map((id, index) => {
              const task = state.tasks.find((t) => t.id === id);
              return task ? { ...task, sortOrder: index } : null;
            })
            .filter(Boolean) as TaskNode[];

          return { tasks: [...otherTasks, ...reordered] };
        });
      },

      moveTask: (taskId, newParentId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, parentId: newParentId } : t
          ),
        }));
      },

      // ==================== TARGETS ====================
      setTarget: (type, amount, period, currency, skipSavingSync = false) => {
        set((state) => {
          const existingIndex = state.targets.findIndex(
            (t) => t.type === type && t.period === period && t.currency === currency
          );
          const now = new Date().toISOString();
          let nextTargets: FinancialTarget[];

          if (existingIndex >= 0) {
            const updated = [...state.targets];
            updated[existingIndex] = {
              ...updated[existingIndex],
              amount,
              updatedAt: now,
            };
            nextTargets = updated;
          } else {
            nextTargets = [
              ...state.targets,
              {
                id: crypto.randomUUID(),
                type,
                amount,
                currency,
                period,
                createdAt: now,
                updatedAt: now,
              },
            ];
          }

          let nextSavings = state.savings;
          if (type === 'savings' && !skipSavingSync) {
            nextSavings = syncSavingsGoalFromTarget(state.savings, amount, currency);
          }

          return { targets: nextTargets, savings: nextSavings };
        });
      },

      // ==================== UTILITIES ====================
      resetAllData: () => {
        set(initialState);
      },

      replaceAllData: (newState) => {
        set({
          ...initialState,
          ...newState,
          version: 2,
        });
      },

      backfillMissingShadowExpenses: () => {
        set((state) => backfillShadowExpensesForGoals(state.goals, state.expenses));
      },

      // Internal migration hook - called on store hydration
      _runMigrationIfNeeded: () => {
        get().backfillMissingShadowExpenses();
      },

      // ==================== COMPUTED GETTERS ====================
      getActiveGoals: () => {
        return get().goals.filter(g => !g.completed);
      },

      getLatestSavingsBalance: () => {
        const savings = get().savings;
        const balanceSavings = savings.filter(s => s.savingType === "balance");
        if (balanceSavings.length === 0) return 0;
        return balanceSavings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount;
      },

      // ==================== MORE USEFUL DERIVED STATE ====================
      getFilteredExpenses: (period: { startDate: Date; endDate: Date } | null) => {
        const expenses = get().expenses;
        if (!period) return expenses;
        return expenses.filter((exp) => isDateInPeriod(exp.date, period));
      },

      getTotalIncome: () => {
        return get().incomes.reduce((sum, inc) => sum + inc.amount, 0);
      },

      getTotalExpenses: (period?: { startDate: Date; endDate: Date } | null) => {
        const expenses = period ? get().getFilteredExpenses(period) : get().expenses;
        return expenses.reduce((sum, exp) => sum + exp.amount, 0);
      },

      getTotalSavings: () => {
        return get().savings.reduce((sum, sav) => sum + sav.amount, 0);
      },

      // Richer derived data
      getActiveGoalsWithTaskCount: () => {
        const state = get();
        return state.goals
          .filter(g => !g.completed)
          .map(goal => ({
            ...goal,
            taskCount: state.tasks.filter(t => t.goalId === goal.id).length,
          }));
      },

      getExpensesByCategory: (period?: { startDate: Date; endDate: Date } | null) => {
        const expenses = period ? get().getFilteredExpenses(period) : get().expenses;
        const byCategory: Record<string, number> = {};
        expenses.forEach(exp => {
          byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
        });
        return byCategory;
      },

      // High-level summary for dashboards/reports
      getDashboardSummary: (period?: { startDate: Date; endDate: Date } | null) => {
        const state = get();
        const filteredExp = period ? state.getFilteredExpenses(period) : state.expenses;

        return {
          totalIncome: state.incomes.reduce((sum, i) => sum + i.amount, 0),
          totalExpenses: filteredExp.reduce((sum, e) => sum + e.amount, 0),
          totalSavings: state.savings.reduce((sum, s) => sum + s.amount, 0),
          activeGoalsCount: state.goals.filter(g => !g.completed).length,
          totalTasks: state.tasks.length,
          latestSavingsBalance: state.getLatestSavingsBalance(),
        };
      },

      // New filtered getters for all major collections
      getFilteredIncomes: (period?: { startDate: Date; endDate: Date } | null) => {
        const incomes = get().incomes;
        if (!period) return incomes;
        return incomes.filter((inc) => isDateInPeriod(inc.date, period));
      },

      getFilteredSavings: (period?: { startDate: Date; endDate: Date } | null) => {
        const savings = get().savings;
        if (!period) return savings;
        return savings.filter((s) => isDateInPeriod(s.date, period));
      },

      getFilteredFixedExpenses: (period?: { startDate: Date; endDate: Date } | null) => {
        const fixed = get().fixedExpenses;
        if (!period) return fixed;
        return fixed.filter((f) => isDateInPeriod(f.date || f.createdAt, period));
      },

      /** Goals whose deadline falls in period — for charts only; management UI uses getActiveGoals(). */
      getFilteredGoals: (period?: { startDate: Date; endDate: Date } | null) => {
        const goals = get().goals;
        if (!period) return goals.filter((g) => !g.completed);
        return goals.filter((g) => {
          if (g.completed) return false;
          return isDateInPeriod(g.deadline || g.createdAt?.slice(0, 10), period);
        });
      },

      getFilteredTasksForGoals: (goalIds: string[]) => {
        const tasks = get().tasks;
        return tasks.filter(t => goalIds.includes(t.goalId));
      },
    }),
    {
      name: 'cash-flow-cfo-storage',
      version: 2, // This is critical for zustand persist migration
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        return migratePersistedState(persistedState, version);
      },
      onRehydrateStorage: () => (state) => {
        state?.backfillMissingShadowExpenses();
      },
    }
  )
);
