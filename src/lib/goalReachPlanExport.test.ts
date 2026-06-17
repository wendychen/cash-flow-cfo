import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales/en';
import { computeGoalReachPlan } from './goalReachPlanner';
import {
  buildGoalReachPlanCsvSection,
  buildGoalReachPlanPrintSection,
} from './goalReachPlanExport';
import type { Goal } from '@/types/goal';

const NOW = new Date('2026-06-17T12:00:00');
const formatAmount = (n: number) => `$${n}`;
const t = (key: string, params?: Record<string, string | number>) => {
  const parts = key.split('.');
  let cur: unknown = en;
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)?.[p];
  }
  let str = typeof cur === 'string' ? cur : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
};

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
  constraint: '',
  urlPack: [],
};

describe('goalReachPlanExport', () => {
  it('includes goal reach plan in print HTML', () => {
    const plan = computeGoalReachPlan(
      {
        goals: [goal],
        tasks: [],
        latestSavingsBalance: 1000,
        monthlySurplus: 200,
        monthlyIncome: 5000,
        monthlyExpenses: 4800,
      },
      NOW
    );

    const html = buildGoalReachPlanPrintSection(plan, formatAmount, t);
    expect(html).toContain('Goal Reach Plan');
    expect(html).toContain('Feasibility');
    expect(html).toContain('Trip');
  });

  it('includes goal reach plan in CSV section', () => {
    const plan = computeGoalReachPlan(
      {
        goals: [goal],
        tasks: [],
        latestSavingsBalance: 1000,
        monthlySurplus: 200,
      },
      NOW
    );

    const csv = buildGoalReachPlanCsvSection(plan);
    expect(csv).toContain('### GOAL REACH PLAN ###');
    expect(csv).toContain('Feasibility');
    expect(csv).toContain('Trip');
  });
});