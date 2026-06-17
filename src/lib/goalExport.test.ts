import { describe, expect, it } from 'vitest';
import {
  buildGoalExportPayload,
  parseGoalImportJSON,
  sortTasksForImport,
} from './goalExport';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';

const goal: Goal = {
  id: 'g1',
  title: 'Learn Rust',
  deadline: '2026-12-31',
  completed: false,
  isMagicWand: false,
  createdAt: '2026-01-01',
  category: 'food',
  budget: 1000,
  timeCost: '',
  ideations: [],
  constraint: '',
  urlPack: [],
};

const parent: TaskNode = {
  id: 't1',
  goalId: 'g1',
  parentId: null,
  taskType: 'pre',
  sortOrder: 0,
  title: 'Parent',
  cost: 0,
  timeCost: '',
  deadline: '2026-06-01',
  isMagicWand: false,
  completed: false,
  createdAt: '2026-01-01',
};

const child: TaskNode = {
  ...parent,
  id: 't2',
  parentId: 't1',
  title: 'Child',
  sortOrder: 1,
};

describe('goalExport', () => {
  it('builds and parses goal bundle', () => {
    const payload = buildGoalExportPayload(goal, [parent, child]);
    const json = JSON.stringify(payload);
    const result = parseGoalImportJSON(json);

    expect(result.success).toBe(true);
    expect(result.payload?.goal.title).toBe('Learn Rust');
    expect(result.payload?.tasks).toHaveLength(2);
  });

  it('sorts tasks parent before child', () => {
    expect(sortTasksForImport([child, parent]).map((t) => t.id)).toEqual(['t1', 't2']);
  });
});