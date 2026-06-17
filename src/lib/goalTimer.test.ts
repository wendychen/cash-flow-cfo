import { describe, expect, it } from 'vitest';
import {
  computeGoalCountdown,
  formatGoalCountdown,
  getGoalTimerTarget,
} from './goalTimer';
import type { Goal } from '@/types/goal';

const baseGoal: Goal = {
  id: 'g1',
  title: 'Test',
  deadline: '2026-12-31',
  completed: false,
  isMagicWand: false,
  createdAt: '2026-01-01',
  category: 'food',
  budget: 0,
  timeCost: '',
  ideations: [],
  constraint: '',
  urlPack: [],
  milestones: [
    {
      id: 'm1',
      title: 'Phase 1',
      targetDate: '2026-06-15',
      completed: false,
    },
  ],
};

describe('goalTimer', () => {
  it('prefers next milestone over deadline', () => {
    const target = getGoalTimerTarget(baseGoal);
    expect(target?.kind).toBe('milestone');
    expect(target?.date).toBe('2026-06-15');
    expect(target?.label).toBe('Phase 1');
  });

  it('falls back to goal deadline', () => {
    const target = getGoalTimerTarget({ ...baseGoal, milestones: [] });
    expect(target?.kind).toBe('deadline');
    expect(target?.date).toBe('2026-12-31');
  });

  it('formats countdown for future dates', () => {
    const countdown = computeGoalCountdown('2030-01-01', new Date('2026-06-01T12:00:00'));
    expect(countdown).not.toBeNull();
    expect(countdown!.isOverdue).toBe(false);
    expect(formatGoalCountdown(countdown!)).toMatch(/left$/);
  });

  it('detects overdue state', () => {
    const countdown = computeGoalCountdown('2020-01-01', new Date('2026-06-01'));
    expect(countdown?.isOverdue).toBe(true);
    expect(countdown?.urgency).toBe('overdue');
  });
});