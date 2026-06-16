import { describe, it, expect } from 'vitest';
import { migrateFromV1, migratePersistedState } from './migration';
import {
  legacyLocalStorageV1,
  expectedMigrationCounts,
} from '@/test/fixtures/legacyLocalStorage';
import { sampleV2State } from '@/test/fixtures/v2State';

function parseLegacyGoals() {
  return JSON.parse(legacyLocalStorageV1.goals);
}

describe('migrateFromV1', () => {
  it('migrates legacy goals with embedded tasks to normalized structure', () => {
    const oldData = {
      version: 1,
      expenses: [],
      incomes: [],
      savings: [],
      fixedExpenses: [],
      targets: [],
      goals: [
        {
          id: 'goal-1',
          title: 'Launch Product',
          deadline: '2026-06-01',
          budget: 5000,
          category: 'business',
          preTasks: [
            { id: 't1', action: 'Research market', cost: 200, timeCost: '3 days' },
          ],
          postTasks: [
            { id: 't2', action: 'Marketing launch', cost: 800 },
          ],
          postDreams: [
            { id: 't3', title: 'Become category leader', cost: 0 },
          ],
        },
      ],
      tasks: [],
    };

    const result = migrateFromV1(oldData);

    expect(result.version).toBe(2);
    expect(result.goals).toHaveLength(1);
    expect(result.goals[0].title).toBe('Launch Product');
    expect((result.goals[0] as Record<string, unknown>).preTasks).toBeUndefined();

    expect(result.tasks).toHaveLength(3);

    const preTask = result.tasks.find((t) => t.title.includes('Research'));
    expect(preTask?.taskType).toBe('pre');
    expect(preTask?.goalId).toBe('goal-1');
    expect(preTask?.cost).toBe(200);

    const dreamTask = result.tasks.find((t) => t.title.includes('category leader'));
    expect(dreamTask?.taskType).toBe('dream');
  });

  it('returns clean v2 state when there is no data', () => {
    const result = migrateFromV1(null);
    expect(result.version).toBe(2);
    expect(result.goals).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
  });

  it('handles goals without any tasks gracefully', () => {
    const oldData = {
      goals: [{ id: 'g1', title: 'Simple Goal' }],
    };
    const result = migrateFromV1(oldData);
    expect(result.goals).toHaveLength(1);
    expect(result.tasks).toHaveLength(0);
  });

  it('preserves non-goal domains from v1 payload', () => {
    const oldData = {
      version: 1,
      expenses: JSON.parse(legacyLocalStorageV1.expenses),
      incomes: JSON.parse(legacyLocalStorageV1.incomes),
      savings: JSON.parse(legacyLocalStorageV1.savings),
      fixedExpenses: JSON.parse(legacyLocalStorageV1.fixedExpenses),
      targets: JSON.parse(legacyLocalStorageV1.financialTargets),
      goals: parseLegacyGoals(),
      tasks: [],
    };

    const result = migrateFromV1(oldData);

    expect(result.expenses).toHaveLength(expectedMigrationCounts.expenses);
    expect(result.incomes).toHaveLength(expectedMigrationCounts.incomes);
    expect(result.savings).toHaveLength(expectedMigrationCounts.savings);
    expect(result.fixedExpenses).toHaveLength(expectedMigrationCounts.fixedExpenses);
    expect(result.targets).toHaveLength(expectedMigrationCounts.targets);
    expect(result.goals).toHaveLength(expectedMigrationCounts.goals);
    expect(result.tasks).toHaveLength(expectedMigrationCounts.tasks);
  });

  it('maps subTasks alias to pre tasks', () => {
    const result = migrateFromV1({
      goals: [
        {
          id: 'g1',
          title: 'Alias Goal',
          subTasks: [{ id: 'st1', action: 'Sub task item', cost: 50 }],
        },
      ],
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].taskType).toBe('pre');
    expect(result.tasks[0].title).toBe('Sub task item');
  });

  it('assigns distinct sortOrder bands per task type', () => {
    const result = migrateFromV1({
      goals: [
        {
          id: 'g1',
          title: 'Sort Goal',
          preTasks: [{ id: 'p1', action: 'Pre' }],
          postTasks: [{ id: 'p2', action: 'Post' }],
          postDreams: [{ id: 'd1', title: 'Dream' }],
        },
      ],
    });

    const pre = result.tasks.find((t) => t.taskType === 'pre');
    const post = result.tasks.find((t) => t.taskType === 'post');
    const dream = result.tasks.find((t) => t.taskType === 'dream');

    expect(pre?.sortOrder).toBe(0);
    expect(post?.sortOrder).toBe(1000);
    expect(dream?.sortOrder).toBe(2000);
  });
});

describe('migratePersistedState', () => {
  it('passes through v2 state unchanged', () => {
    const result = migratePersistedState(sampleV2State, 2);
    expect(result).toEqual(sampleV2State);
  });

  it('migrates v1 state via migrateFromV1', () => {
    const v1 = { version: 1, goals: [{ id: 'g1', title: 'Test' }], expenses: [] };
    const result = migratePersistedState(v1, 1);
    expect(result.version).toBe(2);
    expect(result.goals[0].title).toBe('Test');
  });

  it('returns empty v2 for null persisted state', () => {
    const result = migratePersistedState(null, 0);
    expect(result.version).toBe(2);
    expect(result.expenses).toEqual([]);
  });
});