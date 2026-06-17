import { describe, expect, it, vi } from 'vitest';
import { applyGoalCoachSuggestion } from './goalCoachApply';
import type { Goal } from '@/types/goal';

const goal: Goal = {
  id: 'g1',
  title: 'Trip',
  deadline: '2026-12-01',
  completed: false,
  isMagicWand: false,
  createdAt: '2026-01-01',
  category: 'food',
  budget: 5000,
  timeCost: '',
  ideations: [],
  constraint: '',
  urlPack: [],
};

describe('goalCoachApply', () => {
  it('applies selected deadline shift and budget adjustment', () => {
    const onUpdateGoal = vi.fn();
    const count = applyGoalCoachSuggestion(
      {
        summary: 'Shift trip',
        deadlineShifts: [
          { goalId: 'g1', newDeadline: '2027-01-15', reason: 'More time to save' },
        ],
        budgetAdjustments: [{ goalId: 'g1', newBudget: 6000, reason: 'Inflation buffer' }],
      },
      {
        applyReorder: false,
        deadlineShiftIds: ['g1'],
        budgetAdjustmentIds: ['g1'],
        newMilestoneKeys: [],
      },
      [goal],
      onUpdateGoal
    );

    expect(count).toBe(2);
    expect(onUpdateGoal).toHaveBeenCalledWith('g1', { deadline: '2027-01-15' });
    expect(onUpdateGoal).toHaveBeenCalledWith('g1', { budget: 6000 });
  });
});