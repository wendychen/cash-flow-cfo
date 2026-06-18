import type { GoalReachPlanSnapshot } from '@/lib/goalReachPlanner';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';
import type { GoalCoachRequestBody } from '@/types/goalCoach';
import { isGoalDeadlineLocked } from '@/lib/goalDeadlineLock';
import { getMilestoneProgress, normalizeGoalMilestones } from '@/lib/goalMilestones';

const MAX_GOALS = 20;
const MAX_CONSTRAINT_LEN = 400;

export function buildGoalCoachRequestBody(input: {
  prompt: string;
  locale?: string;
  includeConstraints?: boolean;
  includeCashFlow?: boolean;
  goals: Goal[];
  tasks: TaskNode[];
  plan: GoalReachPlanSnapshot;
  cashSummary: {
    savings: number;
    monthlySurplus: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
  };
  longTermFinGoal?: LongTermFinGoal | null;
}): GoalCoachRequestBody {
  const activeGoals = input.goals
    .filter((g) => !g.completed && g.title.trim())
    .slice(0, MAX_GOALS);

  const rowById = new Map(input.plan.goalRows.map((r) => [r.goalId, r]));

  const goals = activeGoals.map((goal) => {
    const row = rowById.get(goal.id);
    const milestones = normalizeGoalMilestones(goal.milestones);
    const progress = getMilestoneProgress(milestones);
    const taskCostTotal = input.tasks
      .filter((t) => t.goalId === goal.id)
      .reduce((s, t) => s + (t.cost > 0 ? t.cost : 0), 0);

    return {
      id: goal.id,
      title: goal.title,
      deadline: row?.effectiveDeadline ?? goal.deadline,
      budget: goal.budget || 0,
      fundingNeed: (row?.fundingNeed ?? goal.budget) || 0,
      constraint:
        input.includeConstraints && goal.constraint
          ? goal.constraint.slice(0, MAX_CONSTRAINT_LEN)
          : undefined,
      plannerPriority: goal.plannerPriority,
      plannedStartDate: goal.plannedStartDate,
      isMagicWand: goal.isMagicWand,
      deadlineLocked: isGoalDeadlineLocked(goal),
      milestoneCount: progress.total,
      incompleteMilestones: progress.total - progress.completed,
      taskCostTotal,
    };
  });

  return {
    prompt: input.prompt.slice(0, 2000),
    locale: input.locale,
    includeConstraints: input.includeConstraints,
    includeCashFlow: input.includeCashFlow,
    goals,
    cashSummary: {
      savings: input.cashSummary.savings,
      monthlySurplus: input.cashSummary.monthlySurplus,
      monthlyIncome: input.includeCashFlow ? input.cashSummary.monthlyIncome : undefined,
      monthlyExpenses: input.includeCashFlow ? input.cashSummary.monthlyExpenses : undefined,
    },
    feasibility: input.plan.feasibility,
    conflicts: input.plan.conflicts.map((c) => ({
      type: c.type,
      goalIds: c.goalIds,
    })),
    finGoal:
      input.longTermFinGoal && input.longTermFinGoal.targetAmount > 0
        ? {
            targetAmount: input.longTermFinGoal.targetAmount,
            endYear: input.longTermFinGoal.endYear,
          }
        : undefined,
  };
}