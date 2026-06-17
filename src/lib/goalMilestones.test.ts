import { describe, expect, it } from 'vitest';
import {
  getMilestoneProgress,
  getMilestoneTimelinePoints,
  getNextMilestone,
  sortMilestonesByDate,
  toggleMilestoneCompletion,
} from './goalMilestones';
import type { GoalMilestone } from '@/types/goalMilestone';

const m1: GoalMilestone = {
  id: '1',
  title: 'Phase 1',
  targetDate: '2026-03-01',
  completed: false,
};

const m2: GoalMilestone = {
  id: '2',
  title: 'Phase 2',
  targetDate: '2026-06-01',
  completed: true,
  completedAt: '2026-05-01',
};

describe('goalMilestones', () => {
  it('sorts by target date', () => {
    expect(sortMilestonesByDate([m2, m1]).map((m) => m.id)).toEqual(['1', '2']);
  });

  it('computes progress', () => {
    expect(getMilestoneProgress([m1, m2])).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
    });
  });

  it('finds next incomplete milestone', () => {
    expect(getNextMilestone([m1, m2])?.id).toBe('1');
  });

  it('maps timeline positions between start and end', () => {
    const points = getMilestoneTimelinePoints([m1, m2], '2026-01-01', '2026-12-31');
    expect(points[0].positionPercent).toBeLessThan(points[1].positionPercent);
    expect(points[1].positionPercent).toBeGreaterThan(0);
    expect(points[1].positionPercent).toBeLessThan(100);
  });

  it('toggles completion with timestamp', () => {
    const toggled = toggleMilestoneCompletion([m1], '1');
    expect(toggled[0].completed).toBe(true);
    expect(toggled[0].completedAt).toBeDefined();
  });
});