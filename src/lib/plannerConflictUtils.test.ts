import { describe, expect, it } from 'vitest';
import {
  formatConflictDetail,
  getConflictTitleKey,
  suggestClusterDeadlineShift,
} from './plannerConflictUtils';
import type { GoalPlanRow, PlannerConflict } from './goalReachPlanner';

const formatMoney = (amount: number) => `$${amount}`;
const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  return `${key}:${JSON.stringify(params)}`;
};

describe('plannerConflictUtils', () => {
  it('maps conflict types to title keys', () => {
    expect(getConflictTitleKey('over_allocated_budgets')).toBe('goalReach.conflicts.overAllocated');
    expect(getConflictTitleKey('deadline_cluster')).toBe('goalReach.conflicts.deadlineCluster');
  });

  it('formats over-allocation conflict details', () => {
    const conflict: PlannerConflict = {
      type: 'over_allocated_budgets',
      goalIds: ['g1'],
      messageKey: 'goalReach.conflicts.overAllocated',
      messageParams: { allocated: 15000, savings: 10000, gap: 5000 },
    };

    const detail = formatConflictDetail(conflict, formatMoney, t, new Map());
    expect(detail).toContain('goalReach.conflicts.overAllocatedDetail');
    expect(detail).toContain('$15000');
    expect(detail).toContain('$5000');
  });

  it('suggests shifting the latest non-magic-wand goal in a cluster', () => {
    const conflict: PlannerConflict = {
      type: 'deadline_cluster',
      goalIds: ['g1', 'g2', 'g3'],
      messageKey: 'goalReach.conflicts.deadlineCluster',
      messageParams: { windowStart: '2026-09-01', count: 3, combinedNeed: 3000 },
    };

    const goalRows: GoalPlanRow[] = [
      {
        goalId: 'g1',
        title: 'A',
        effectiveDeadline: '2026-09-01',
        timerLabel: null,
        taskCostTotal: 0,
        fundingNeed: 1000,
        allocatedSavings: 1000,
        fundingGap: 0,
        daysToDeadline: 30,
        earliestFeasibleDeadline: '2026-09-01',
        atRisk: true,
        atRiskReasons: ['deadline_cluster'],
        timelineStartPercent: 0,
        timelineEndPercent: 20,
        isMagicWand: true,
      },
      {
        goalId: 'g2',
        title: 'B',
        effectiveDeadline: '2026-09-10',
        timerLabel: null,
        taskCostTotal: 0,
        fundingNeed: 1000,
        allocatedSavings: 500,
        fundingGap: 500,
        daysToDeadline: 40,
        earliestFeasibleDeadline: '2026-10-01',
        atRisk: true,
        atRiskReasons: ['deadline_cluster', 'funding_gap'],
        timelineStartPercent: 0,
        timelineEndPercent: 25,
        isMagicWand: false,
      },
      {
        goalId: 'g3',
        title: 'C',
        effectiveDeadline: '2026-09-20',
        timerLabel: null,
        taskCostTotal: 0,
        fundingNeed: 1000,
        allocatedSavings: 500,
        fundingGap: 500,
        daysToDeadline: 50,
        earliestFeasibleDeadline: '2026-10-15',
        atRisk: true,
        atRiskReasons: ['deadline_cluster', 'funding_gap'],
        timelineStartPercent: 0,
        timelineEndPercent: 30,
        isMagicWand: false,
      },
    ];

    const shift = suggestClusterDeadlineShift(conflict, goalRows);
    expect(shift?.goalId).toBe('g3');
    expect(shift?.goalTitle).toBe('C');
    expect(shift?.newDeadline).toBe('2026-11-19');
  });
});