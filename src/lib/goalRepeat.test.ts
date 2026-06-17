import { describe, expect, it } from 'vitest';
import {
  advanceDateByInterval,
  buildDuplicatedTasksForCycle,
  buildNextCycleGoalFields,
} from './goalRepeat';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';

const goal: Goal = {
  id: 'g1',
  title: 'Monthly review',
  deadline: '2026-03-31',
  completed: true,
  isMagicWand: false,
  createdAt: '2026-01-01',
  category: 'food',
  budget: 500,
  timeCost: '2h',
  ideations: [],
  constraint: '',
  urlPack: [],
  repeatInterval: 'monthly',
  repeatCycle: 1,
  milestones: [
    { id: 'm1', title: 'Check-in', targetDate: '2026-03-15', completed: true },
  ],
};

describe('goalRepeat', () => {
  it('advances dates by interval', () => {
    expect(advanceDateByInterval('2026-03-31', 'monthly')).toBe('2026-04-30');
    expect(advanceDateByInterval('2026-03-31', 'weekly')).toBe('2026-04-07');
  });

  it('builds next cycle goal fields', () => {
    const next = buildNextCycleGoalFields(goal);
    expect(next).not.toBeNull();
    expect(next!.deadline).toBe('2026-04-30');
    expect(next!.repeatCycle).toBe(2);
    expect(next!.repeatSeriesId).toBe('g1');
    expect(next!.completed).toBe(false);
    expect(next!.milestones[0].completed).toBe(false);
    expect(next!.milestones[0].targetDate).toBe('2026-04-15');
  });

  it('returns null when not repeating', () => {
    expect(buildNextCycleGoalFields({ ...goal, repeatInterval: 'none' })).toBeNull();
  });

  it('carries repeatDuplicateTasks preference into next cycle', () => {
    const withDup = buildNextCycleGoalFields({ ...goal, repeatDuplicateTasks: false });
    expect(withDup?.repeatDuplicateTasks).toBe(false);

    const defaultDup = buildNextCycleGoalFields(goal);
    expect(defaultDup?.repeatDuplicateTasks).toBe(true);
  });

  it('duplicates tasks for next cycle with advanced deadlines', () => {
    const tasks: TaskNode[] = [
      {
        id: 't1',
        goalId: 'g1',
        parentId: null,
        taskType: 'pre',
        sortOrder: 0,
        title: 'Research',
        cost: 100,
        timeCost: '2h',
        deadline: '2026-03-15',
        isMagicWand: false,
        completed: true,
        createdAt: '2026-01-01',
      },
    ];
    const next = buildDuplicatedTasksForCycle(tasks, 'g1', 'g2', 'monthly');
    expect(next).toHaveLength(1);
    expect(next[0].goalId).toBe('g2');
    expect(next[0].completed).toBe(false);
    expect(next[0].deadline).toBe('2026-04-15');
    expect(next[0].id).not.toBe('t1');
  });
});