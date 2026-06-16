import { describe, it, expect } from 'vitest';
import { migrateFromV1 } from './migration';

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
    // Embedded task arrays should be gone
    expect((result.goals[0] as any).preTasks).toBeUndefined();

    // All tasks should now be in flat array
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
});
