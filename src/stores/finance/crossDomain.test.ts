/**
 * Cross-domain orchestration spec tests (Direction 2).
 *
 * Cross-domain invariants ported from ExpenseTracker into the Zustand store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore } from './financeStore';
import { resetFinanceStore } from '@/test/helpers/storeTestUtils';

describe('cross-domain orchestration (Direction 2 spec)', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
  });

  it('addGoal creates a shadow expense linked to the goal', () => {
    useFinanceStore.getState().addGoal({
      title: 'New Product',
      deadline: '2026-12-01',
      completed: false,
      isMagicWand: false,
      category: 'business',
      budget: 5000,
      timeCost: '1 month',
      ideations: [],
      constraint: '',
      urlPack: [],
    });

    const state = useFinanceStore.getState();
    const goal = state.goals.find((g) => g.title === 'New Product');
    expect(goal).toBeDefined();
    expect(goal?.linkedExpenseId).toBeTruthy();

    const shadowExpense = state.expenses.find((e) => e.id === goal?.linkedExpenseId);
    expect(shadowExpense).toBeDefined();
    expect(shadowExpense?.linkedGoalId).toBe(goal?.id);
    expect(shadowExpense?.description).toMatch(/New Product/i);
    expect(shadowExpense?.needsCheck).toBe(true);
  });

  it('addTask creates a shadow expense linked to goal and task', () => {
    useFinanceStore.getState().addGoal({
      title: 'Parent Goal',
      deadline: '2026-06-01',
      completed: false,
      isMagicWand: false,
      category: 'misc',
      budget: 0,
      timeCost: '',
      ideations: [],
      constraint: '',
      urlPack: [],
    });

    const goalId = useFinanceStore.getState().goals[0].id;

    useFinanceStore.getState().addTask({
      goalId,
      parentId: null,
      taskType: 'pre',
      sortOrder: 0,
      title: 'Research phase',
      cost: 300,
      timeCost: '1 week',
      deadline: '2026-03-01',
      isMagicWand: false,
      completed: false,
    });

    const state = useFinanceStore.getState();
    const task = state.tasks.find((t) => t.title === 'Research phase');
    expect(task?.linkedExpenseId).toBeTruthy();

    const expense = state.expenses.find((e) => e.id === task?.linkedExpenseId);
    expect(expense?.linkedGoalId).toBe(goalId);
    expect(expense?.linkedTaskId).toBe(task?.id);
    expect(expense?.linkedTaskType).toBe('pre');
  });

  it('updateExpense syncs linked goal fields', () => {
    resetFinanceStore(useFinanceStore, {
      goals: [
        {
          id: 'goal-1',
          title: 'Old Title',
          deadline: '2026-01-01',
          completed: false,
          isMagicWand: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          linkedExpenseId: 'exp-1',
          category: 'misc',
          budget: 100,
          timeCost: '1 day',
          ideations: [],
          constraint: '',
          urlPack: [],
        },
      ],
      expenses: [
        {
          id: 'exp-1',
          date: '2026-01-01',
          description: 'Goal: Old Title',
          amount: 100,
          timeCost: '1 day',
          needsCheck: true,
          category: 'misc',
          linkedGoalId: 'goal-1',
        },
      ],
    });

    useFinanceStore.getState().updateExpense('exp-1', {
      description: 'Goal: Updated Title',
      amount: 250,
      date: '2026-02-01',
      category: 'business',
    });

    const goal = useFinanceStore.getState().goals.find((g) => g.id === 'goal-1');
    expect(goal?.title).toBe('Updated Title');
    expect(goal?.budget).toBe(250);
    expect(goal?.deadline).toBe('2026-02-01');
    expect(goal?.category).toBe('business');
  });

  it('deleteGoal cascades to linked expenses and tasks', () => {
    resetFinanceStore(useFinanceStore, {
      goals: [
        {
          id: 'goal-1',
          title: 'Delete Me',
          deadline: '2026-06-01',
          completed: false,
          isMagicWand: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          linkedExpenseId: 'exp-goal',
          category: 'misc',
          budget: 0,
          timeCost: '',
          ideations: [],
          constraint: '',
          urlPack: [],
        },
      ],
      expenses: [
        {
          id: 'exp-goal',
          date: '2026-01-01',
          description: 'Goal: Delete Me',
          amount: 0,
          timeCost: '',
          needsCheck: true,
          category: 'misc',
          linkedGoalId: 'goal-1',
        },
        {
          id: 'exp-task',
          date: '2026-01-02',
          description: 'Task: Sub task',
          amount: 50,
          timeCost: '',
          needsCheck: false,
          category: 'misc',
          linkedGoalId: 'goal-1',
          linkedTaskId: 'task-1',
          linkedTaskType: 'pre',
        },
      ],
      tasks: [
        {
          id: 'task-1',
          goalId: 'goal-1',
          parentId: null,
          taskType: 'pre',
          sortOrder: 0,
          title: 'Sub task',
          cost: 50,
          timeCost: '',
          deadline: '2026-02-01',
          isMagicWand: false,
          completed: false,
          linkedExpenseId: 'exp-task',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    useFinanceStore.getState().deleteGoal('goal-1');

    const state = useFinanceStore.getState();
    expect(state.goals).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.expenses).toHaveLength(0);
  });

  it('deleteExpense reparents child tasks and removes linked task', () => {
    resetFinanceStore(useFinanceStore, {
      expenses: [
        {
          id: 'exp-parent',
          date: '2026-01-01',
          description: 'Task: Parent',
          amount: 0,
          timeCost: '',
          needsCheck: false,
          category: 'misc',
          linkedGoalId: 'goal-1',
          linkedTaskId: 'task-parent',
          linkedTaskType: 'pre',
        },
      ],
      tasks: [
        {
          id: 'task-parent',
          goalId: 'goal-1',
          parentId: null,
          taskType: 'pre',
          sortOrder: 0,
          title: 'Parent',
          cost: 0,
          timeCost: '',
          deadline: '2026-02-01',
          isMagicWand: false,
          completed: false,
          linkedExpenseId: 'exp-parent',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'task-child',
          goalId: 'goal-1',
          parentId: 'task-parent',
          taskType: 'pre',
          sortOrder: 1,
          title: 'Child',
          cost: 0,
          timeCost: '',
          deadline: '2026-03-01',
          isMagicWand: false,
          completed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    useFinanceStore.getState().deleteExpense('exp-parent');

    const state = useFinanceStore.getState();
    expect(state.tasks.find((t) => t.id === 'task-parent')).toBeUndefined();
    expect(state.tasks.find((t) => t.id === 'task-child')?.parentId).toBeNull();
  });

  it('updateGoal category propagates to all goal-linked expenses', () => {
    resetFinanceStore(useFinanceStore, {
      goals: [
        {
          id: 'goal-1',
          title: 'Category Goal',
          deadline: '2026-06-01',
          completed: false,
          isMagicWand: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          linkedExpenseId: 'exp-goal',
          category: 'misc',
          budget: 0,
          timeCost: '',
          ideations: [],
          constraint: '',
          urlPack: [],
        },
      ],
      expenses: [
        {
          id: 'exp-goal',
          date: '2026-01-01',
          description: 'Goal: Category Goal',
          amount: 0,
          timeCost: '',
          needsCheck: true,
          category: 'misc',
          linkedGoalId: 'goal-1',
        },
        {
          id: 'exp-task',
          date: '2026-01-02',
          description: 'Task: Step',
          amount: 0,
          timeCost: '',
          needsCheck: false,
          category: 'misc',
          linkedGoalId: 'goal-1',
          linkedTaskId: 'task-1',
          linkedTaskType: 'pre',
        },
      ],
    });

    useFinanceStore.getState().updateGoal('goal-1', { category: 'business' });

    const expenses = useFinanceStore.getState().expenses;
    expect(expenses.every((e) => e.linkedGoalId === 'goal-1' ? e.category === 'business' : true)).toBe(true);
  });
});

describe('income update validation', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
  });

  it('rejects accrued amount below collected total', () => {
    useFinanceStore.setState({
      incomes: [
        {
          id: 'a1',
          date: '2026-01-01',
          source: 'Invoice',
          amount: 1000,
          incomeType: 'accrued',
        },
        {
          id: 'c1',
          date: '2026-01-15',
          source: 'Invoice',
          amount: 400,
          incomeType: 'cash',
          linkedAccruedIncomeId: 'a1',
        },
      ],
    });

    const result = useFinanceStore.getState().updateIncome('a1', { amount: 300 });
    expect(result).toEqual({ ok: false, errorKey: 'income.collection.errors.belowCollected' });
    expect(useFinanceStore.getState().incomes.find((i) => i.id === 'a1')?.amount).toBe(1000);
  });

  it('returns ok true for valid updates', () => {
    useFinanceStore.setState({
      incomes: [
        {
          id: 'a1',
          date: '2026-01-01',
          source: 'Invoice',
          amount: 1000,
          incomeType: 'accrued',
        },
      ],
    });

    const result = useFinanceStore.getState().updateIncome('a1', { amount: 1200 });
    expect(result).toEqual({ ok: true });
    expect(useFinanceStore.getState().incomes.find((i) => i.id === 'a1')?.amount).toBe(1200);
  });

  it('recordAccruedCollection returns validation errors', () => {
    useFinanceStore.setState({
      incomes: [
        {
          id: 'a1',
          date: '2026-01-01',
          source: 'Invoice',
          amount: 1000,
          incomeType: 'accrued',
        },
        {
          id: 'c1',
          date: '2026-01-15',
          source: 'Invoice',
          amount: 400,
          incomeType: 'cash',
          linkedAccruedIncomeId: 'a1',
        },
      ],
    });

    const over = useFinanceStore.getState().recordAccruedCollection('a1', {
      date: '2026-02-01',
      amount: 700,
    });
    expect(over).toEqual({ ok: false, errorKey: 'income.collection.errors.exceedsOutstanding' });

    const ok = useFinanceStore.getState().recordAccruedCollection('a1', {
      date: '2026-02-01',
      amount: 200,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(useFinanceStore.getState().incomes.some((i) => i.id === ok.id)).toBe(true);
    }
  });

  it('rejects accrued to cash when collections exist', () => {
    useFinanceStore.setState({
      incomes: [
        {
          id: 'a1',
          date: '2026-01-01',
          source: 'Invoice',
          amount: 1000,
          incomeType: 'accrued',
        },
        {
          id: 'c1',
          date: '2026-01-15',
          source: 'Invoice',
          amount: 400,
          incomeType: 'cash',
          linkedAccruedIncomeId: 'a1',
        },
      ],
    });

    const result = useFinanceStore.getState().updateIncome('a1', { incomeType: 'cash' });
    expect(result).toEqual({ ok: false, errorKey: 'income.collection.errors.hasCollections' });
    expect(useFinanceStore.getState().incomes.find((i) => i.id === 'a1')?.incomeType).toBe('accrued');
  });
});