import { describe, expect, it } from 'vitest';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';
import {
  computeGoalReachPlan,
  detectDeadlineClusters,
  DEFAULT_GOAL_REACH_HORIZON_MONTHS,
} from './goalReachPlanner';

const NOW = new Date('2026-06-17T12:00:00');

function makeGoal(overrides: Partial<Goal> & Pick<Goal, 'id' | 'title'>): Goal {
  return {
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
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskNode> & Pick<TaskNode, 'id' | 'goalId' | 'title'>): TaskNode {
  return {
    parentId: null,
    taskType: 'pre',
    sortOrder: 0,
    cost: 0,
    timeCost: '',
    deadline: '',
    isMagicWand: false,
    completed: false,
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('goalReachPlanner', () => {
  it('returns empty snapshot when no active goals', () => {
    const plan = computeGoalReachPlan(
      {
        goals: [
          makeGoal({ id: 'g1', title: 'Done', completed: true, budget: 5000 }),
          makeGoal({ id: 'g2', title: '   ', budget: 1000 }),
        ],
        tasks: [],
        latestSavingsBalance: 10_000,
        monthlySurplus: 500,
      },
      NOW
    );

    expect(plan.activeGoalCount).toBe(0);
    expect(plan.goalRows).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.feasibility).toBe(100);
    expect(plan.weeklyFocus).toHaveLength(0);
    expect(plan.monthlyFunding).toHaveLength(0);
    expect(plan.simulationCheckpoints).toHaveLength(0);
  });

  it('adds simulation shortfall conflicts when income and expenses provided', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        title: 'Big trip',
        budget: 15000,
        deadline: '2026-09-01',
      }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 2000,
        monthlySurplus: 500,
        monthlyIncome: 6000,
        monthlyExpenses: 5500,
        horizonMonths: 12,
      },
      NOW
    );

    const simConflict = plan.conflicts.find((c) => c.type === 'simulation_shortfall');
    expect(simConflict).toBeDefined();
    expect(plan.simulationCheckpoints.some((c) => c.atRisk)).toBe(true);
  });

  it('computes a single fully funded goal', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        title: 'Vacation',
        budget: 3000,
        deadline: '2026-09-30',
      }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 10_000,
        monthlySurplus: 1000,
        horizonMonths: 12,
      },
      NOW
    );

    expect(plan.activeGoalCount).toBe(1);
    expect(plan.goalRows[0].fundingNeed).toBe(3000);
    expect(plan.goalRows[0].fundingGap).toBe(0);
    expect(plan.goalRows[0].atRisk).toBe(false);
    expect(plan.conflicts.some((c) => c.type === 'funding_gap')).toBe(false);
  });

  it('flags over-allocated budgets', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'A', budget: 8000 }),
      makeGoal({ id: 'g2', title: 'B', budget: 7000 }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 10_000,
        monthlySurplus: 500,
      },
      NOW
    );

    const conflict = plan.conflicts.find((c) => c.type === 'over_allocated_budgets');
    expect(conflict).toBeDefined();
    expect(plan.savingsGap).toBe(5000);
    expect(conflict?.messageParams?.allocated).toBe(15_000);
    expect(conflict?.messageParams?.savings).toBe(10_000);
  });

  it('flags task costs that exceed goal budget', () => {
    const goals = [makeGoal({ id: 'g1', title: 'Launch', budget: 5000 })];
    const tasks = [
      makeTask({ id: 't1', goalId: 'g1', title: 'Vendor', cost: 4000 }),
      makeTask({ id: 't2', goalId: 'g1', title: 'Ads', cost: 3000 }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks,
        latestSavingsBalance: 20_000,
        monthlySurplus: 1000,
      },
      NOW
    );

    const row = plan.goalRows[0];
    expect(row.taskCostTotal).toBe(7000);
    expect(row.fundingNeed).toBe(7000);

    const conflict = plan.conflicts.find((c) => c.type === 'task_cost_exceeds_budget');
    expect(conflict).toBeDefined();
    expect(conflict?.goalIds).toEqual(['g1']);
    expect(conflict?.messageParams?.taskCost).toBe(7000);
    expect(conflict?.messageParams?.budget).toBe(5000);
  });

  it('detects deadline clusters of three or more goals within 30 days', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'A', deadline: '2026-09-01', budget: 1000 }),
      makeGoal({ id: 'g2', title: 'B', deadline: '2026-09-10', budget: 1000 }),
      makeGoal({ id: 'g3', title: 'C', deadline: '2026-09-20', budget: 1000 }),
      makeGoal({ id: 'g4', title: 'D', deadline: '2026-12-01', budget: 1000 }),
    ];

    const clusters = detectDeadlineClusters(goals, NOW);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].goalIds).toEqual(['g1', 'g2', 'g3']);

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 10_000,
        monthlySurplus: 500,
      },
      NOW
    );

    const clusterConflict = plan.conflicts.find((c) => c.type === 'deadline_cluster');
    expect(clusterConflict).toBeDefined();
    expect(clusterConflict?.goalIds).toEqual(['g1', 'g2', 'g3']);
    expect(plan.goalRows.filter((r) => r.atRiskReasons.includes('deadline_cluster'))).toHaveLength(3);
  });

  it('computes feasibility breakdown from coverage, spread, surplus, and milestones', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        title: 'Funded',
        budget: 2000,
        deadline: '2026-08-01',
        milestones: [
          { id: 'm1', title: 'Done', targetDate: '2026-07-01', completed: true },
          { id: 'm2', title: 'Next', targetDate: '2026-08-01', completed: false },
        ],
      }),
      makeGoal({
        id: 'g2',
        title: 'Stretch',
        budget: 8000,
        deadline: '2027-06-01',
      }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 5000,
        monthlySurplus: 300,
        horizonMonths: 24,
      },
      NOW
    );

    expect(plan.totalFundingNeed).toBe(10_000);
    expect(plan.feasibilityBreakdown.budgetCoverage).toBe(50);
    expect(plan.feasibilityBreakdown.deadlineSpread).toBe(100);
    expect(plan.feasibilityBreakdown.milestoneCompletion).toBe(50);
    expect(plan.feasibility).toBe(
      Math.round(
        50 * 0.4 + 100 * 0.3 + plan.feasibilityBreakdown.surplusCoverage * 0.2 + 50 * 0.1
      )
    );
    expect(plan.feasibilityBreakdown.total).toBe(plan.feasibility);
  });

  it('sorts weekly focus with magic wand items first, then by urgency', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'Normal goal', isMagicWand: false }),
      makeGoal({ id: 'g2', title: 'Wand goal', isMagicWand: true }),
    ];
    const tasks = [
      makeTask({
        id: 't1',
        goalId: 'g1',
        title: 'Due tomorrow',
        deadline: '2026-06-18',
        isMagicWand: false,
      }),
      makeTask({
        id: 't2',
        goalId: 'g2',
        title: 'Wand task in 5 days',
        deadline: '2026-06-22',
        isMagicWand: false,
      }),
      makeTask({
        id: 't3',
        goalId: 'g1',
        title: 'Urgent normal',
        deadline: '2026-06-19',
        isMagicWand: false,
      }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks,
        latestSavingsBalance: 10_000,
        monthlySurplus: 500,
      },
      NOW
    );

    expect(plan.weeklyFocus).toHaveLength(3);
    expect(plan.weeklyFocus[0].goalId).toBe('g2');
    expect(plan.weeklyFocus[0].isMagicWand).toBe(true);
    expect(plan.weeklyFocus[1].title).toBe('Due tomorrow');
    expect(plan.weeklyFocus[2].title).toBe('Urgent normal');
  });

  it('sorts goal rows by planner priority before deadline', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'Soon', budget: 1000, deadline: '2026-07-01', plannerPriority: 2 }),
      makeGoal({ id: 'g2', title: 'Later but priority', budget: 500, deadline: '2026-12-01', plannerPriority: 1 }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 0,
        monthlySurplus: 500,
        horizonMonths: 6,
      },
      NOW
    );

    expect(plan.goalRows[0].goalId).toBe('g2');
    expect(plan.goalRows[1].goalId).toBe('g1');
  });

  it('assigns monthly surplus greedily by deadline order', () => {
    const goals = [
      makeGoal({ id: 'g1', title: 'Soon', budget: 1000, deadline: '2026-08-01' }),
      makeGoal({ id: 'g2', title: 'Later', budget: 500, deadline: '2026-12-01' }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 0,
        monthlySurplus: 800,
        horizonMonths: 6,
      },
      NOW
    );

    expect(plan.goalRows[0].goalId).toBe('g1');
    expect(plan.goalRows[0].fundingGap).toBe(1000);
    expect(plan.goalRows[1].fundingGap).toBe(500);

    const month0 = plan.monthlyFunding[0];
    const month1 = plan.monthlyFunding[1];

    expect(month0.month).toBe('2026-06');
    expect(month0.byGoalId.g1).toBe(800);
    expect(month0.byGoalId.g2).toBe(0);

    expect(month1.byGoalId.g1).toBe(200);
    expect(month1.byGoalId.g2).toBe(500);
    expect(month1.total).toBe(700);
  });

  it('marks overdue goals and emits overdue conflicts', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        title: 'Late',
        budget: 1000,
        deadline: '2020-01-01',
        milestones: [],
      }),
    ];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 5000,
        monthlySurplus: 200,
      },
      NOW
    );

    expect(plan.goalRows[0].atRiskReasons).toContain('overdue');
    expect(plan.conflicts.some((c) => c.type === 'overdue' && c.goalIds.includes('g1'))).toBe(true);
  });

  it('uses default horizon when not specified', () => {
    const goals = [makeGoal({ id: 'g1', title: 'One', budget: 50_000, deadline: '2028-01-01' })];

    const plan = computeGoalReachPlan(
      {
        goals,
        tasks: [],
        latestSavingsBalance: 1000,
        monthlySurplus: 100,
      },
      NOW
    );

    expect(plan.monthlyFunding.length).toBeGreaterThan(0);
    expect(plan.monthlyFunding.length).toBeLessThanOrEqual(DEFAULT_GOAL_REACH_HORIZON_MONTHS);
  });
});