import { describe, expect, it } from 'vitest';
import { computeGoalReachPlan } from './goalReachPlanner';
import { buildGoalCoachRequestBody } from './goalCoachPayload';
import type { Goal } from '@/types/goal';

const NOW = new Date('2026-06-17T12:00:00');

const goal: Goal = {
  id: 'g1',
  title: 'Trip',
  deadline: '2026-09-01',
  completed: false,
  isMagicWand: false,
  createdAt: '2026-01-01',
  category: 'food',
  budget: 5000,
  timeCost: '',
  ideations: [],
  constraint: 'No flights before August',
  urlPack: [],
  plannerPriority: 2,
};

describe('goalCoachPayload', () => {
  it('builds sanitized coach request from planner snapshot', () => {
    const plan = computeGoalReachPlan(
      {
        goals: [goal],
        tasks: [],
        latestSavingsBalance: 3000,
        monthlySurplus: 500,
      },
      NOW
    );

    const body = buildGoalCoachRequestBody({
      prompt: 'Help me sequence goals',
      locale: 'en',
      includeConstraints: true,
      includeCashFlow: true,
      goals: [goal],
      tasks: [],
      plan,
      cashSummary: {
        savings: 3000,
        monthlySurplus: 500,
        monthlyIncome: 8000,
        monthlyExpenses: 7500,
      },
    });

    expect(body.goals).toHaveLength(1);
    expect(body.goals[0].constraint).toContain('No flights');
    expect(body.cashSummary.monthlyIncome).toBe(8000);
    expect(body.feasibility).toBe(plan.feasibility);
    expect(body.conflicts).toBeDefined();
  });
});