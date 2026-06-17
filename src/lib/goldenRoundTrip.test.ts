import { describe, it, expect, beforeEach } from 'vitest';
import { parseImportJSON } from './exportImport';
import { sampleV2State } from '@/test/fixtures/v2State';
import { idpGoalState } from '@/test/fixtures/idpGoalState';
import { useFinanceStore } from '@/stores/finance/financeStore';
import { resetFinanceStore } from '@/test/helpers/storeTestUtils';
import { buildMonthPeriod } from './date';

function wrapForExport(data: typeof sampleV2State) {
  return {
    meta: {
      app: 'cash-flow-cfo' as const,
      schemaVersion: 2 as const,
      exportedAt: new Date().toISOString(),
      counts: {
        expenses: data.expenses.length,
        incomes: data.incomes.length,
        savings: data.savings.length,
        fixedExpenses: data.fixedExpenses.length,
        targets: data.targets.length,
        goals: data.goals.length,
        tasks: data.tasks.length,
      },
    },
    data,
  };
}

describe('golden round-trip — data consistency', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
  });

  it('preserves goals, tasks, and linked expenses through export → import', () => {
    const payload = wrapForExport(sampleV2State);
    const parsed = parseImportJSON(JSON.stringify(payload));
    expect(parsed.success).toBe(true);

    useFinanceStore.getState().replaceAllData(parsed.data!);
    const state = useFinanceStore.getState();

    expect(state.goals).toHaveLength(1);
    expect(state.tasks).toHaveLength(2);
    expect(state.expenses).toHaveLength(2);

    const goal = state.goals[0];
    expect(goal.linkedExpenseId).toBe('exp-goal');
    expect(state.expenses.find((e) => e.id === goal.linkedExpenseId)?.linkedGoalId).toBe(goal.id);

    const task = state.tasks.find((t) => t.id === 'task-a')!;
    expect(task.linkedExpenseId).toBe('exp-task');
    expect(state.expenses.find((e) => e.id === task.linkedExpenseId)?.linkedTaskId).toBe('task-a');
  });

  it('preserves IDP goal shadow expense and task links', () => {
    const parsed = parseImportJSON(JSON.stringify(wrapForExport(idpGoalState)));
    expect(parsed.success).toBe(true);

    useFinanceStore.getState().replaceAllData(parsed.data!);
    const state = useFinanceStore.getState();

    const idpGoal = state.goals.find((g) => g.title === 'I have IDP.');
    expect(idpGoal).toBeDefined();
    expect(idpGoal?.linkedExpenseId).toBe('exp-idp');

    const shadow = state.expenses.find((e) => e.id === idpGoal?.linkedExpenseId);
    expect(shadow?.description).toContain('IDP');
    expect(shadow?.linkedGoalId).toBe(idpGoal?.id);

    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].linkedExpenseId).toBe('exp-task-idp');
  });

  it('backfill restores missing shadow expense after import', () => {
    const broken = structuredClone(idpGoalState);
    broken.goals[0].linkedExpenseId = undefined;
    broken.expenses = broken.expenses.filter((e) => e.linkedGoalId !== 'goal-idp' || e.linkedTaskId);

    useFinanceStore.getState().replaceAllData(broken);
    useFinanceStore.getState().backfillMissingShadowExpenses();

    const state = useFinanceStore.getState();
    const goal = state.goals.find((g) => g.id === 'goal-idp')!;
    expect(goal.linkedExpenseId).toBeTruthy();

    const shadow = state.expenses.find((e) => e.id === goal.linkedExpenseId);
    expect(shadow?.linkedGoalId).toBe('goal-idp');
    expect(shadow?.description).toMatch(/IDP/i);
  });
});

describe('golden round-trip — date filtering after import', () => {
  beforeEach(() => {
    resetFinanceStore(useFinanceStore);
    useFinanceStore.getState().replaceAllData(sampleV2State);
  });

  it('includes 2026-03-05 expense in March 2026', () => {
    const march = buildMonthPeriod(2026, 2);
    const filtered = useFinanceStore.getState().getFilteredExpenses(march);
    expect(filtered.some((e) => e.date === '2026-03-05')).toBe(true);
  });

  it('active goals stay visible when deadline is outside selected period', () => {
    const store = useFinanceStore.getState();
    store.updateGoal('goal-a', { deadline: '2027-01-01' });

    const march2026 = buildMonthPeriod(2026, 2);
    expect(store.getFilteredGoals(march2026).some((g) => g.id === 'goal-a')).toBe(false);
    expect(store.getActiveGoals().some((g) => g.id === 'goal-a')).toBe(true);
  });
});