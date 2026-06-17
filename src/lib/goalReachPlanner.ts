import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';
import { computeGoalCountdown, getGoalTimerTarget } from '@/lib/goalTimer';
import { getMilestoneProgress, normalizeGoalMilestones } from '@/lib/goalMilestones';
import { parseLocalDate } from '@/lib/date';
import {
  simulateGoalFundingSchedule,
  type GoalFundingCheckpointResult,
} from '@/lib/cashFlowSimulation';

export const DEFAULT_GOAL_REACH_HORIZON_MONTHS = 36;
export const DEADLINE_CLUSTER_WINDOW_DAYS = 30;
export const DEADLINE_CLUSTER_MIN_GOALS = 3;
export const WEEKLY_FOCUS_HORIZON_DAYS = 7;
export const DEFAULT_WEEKLY_FOCUS_LIMIT = 3;

export interface GoalReachPlannerInput {
  goals: Goal[];
  tasks: TaskNode[];
  latestSavingsBalance: number;
  monthlySurplus: number;
  longTermFinGoal?: LongTermFinGoal | null;
  horizonMonths?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

export type PlannerConflictType =
  | 'over_allocated_budgets'
  | 'task_cost_exceeds_budget'
  | 'deadline_cluster'
  | 'funding_gap'
  | 'overdue'
  | 'simulation_shortfall';

export interface PlannerConflict {
  type: PlannerConflictType;
  goalIds: string[];
  messageKey: string;
  messageParams?: Record<string, string | number>;
  suggestedDeadline?: string;
}

export interface GoalPlanRow {
  goalId: string;
  title: string;
  effectiveDeadline: string | null;
  timerLabel: string | null;
  taskCostTotal: number;
  fundingNeed: number;
  allocatedSavings: number;
  fundingGap: number;
  daysToDeadline: number | null;
  earliestFeasibleDeadline: string | null;
  atRisk: boolean;
  atRiskReasons: PlannerConflictType[];
  timelineStartPercent: number;
  timelineEndPercent: number;
  isMagicWand: boolean;
}

export interface FeasibilityBreakdown {
  budgetCoverage: number;
  deadlineSpread: number;
  surplusCoverage: number;
  milestoneCompletion: number;
  total: number;
}

export interface WeeklyFocusItem {
  goalId: string;
  goalTitle: string;
  title: string;
  kind: 'task' | 'milestone';
  targetDate: string;
  isMagicWand: boolean;
  daysUntil: number;
}

export interface MonthlyFundingSlice {
  month: string;
  byGoalId: Record<string, number>;
  total: number;
  surplusAvailable: number;
}

export interface GoalReachPlanSnapshot {
  computedAt: string;
  activeGoalCount: number;
  feasibility: number;
  feasibilityBreakdown: FeasibilityBreakdown;
  totalFundingNeed: number;
  totalBudgetAllocated: number;
  savingsGap: number;
  goalRows: GoalPlanRow[];
  conflicts: PlannerConflict[];
  monthlyFunding: MonthlyFundingSlice[];
  weeklyFocus: WeeklyFocusItem[];
  simulationCheckpoints: GoalFundingCheckpointResult[];
}

function getActiveGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => !g.completed && g.title.trim());
}

function sumTaskCostsForGoal(goalId: string, tasks: TaskNode[]): number {
  return tasks
    .filter((t) => t.goalId === goalId)
    .reduce((sum, t) => sum + (t.cost > 0 ? t.cost : 0), 0);
}

function resolveEffectiveDeadline(goal: Goal, now: Date): string | null {
  const target = getGoalTimerTarget(goal);
  if (target?.date) return target.date;
  if (goal.deadline) return goal.deadline;
  return null;
}

function daysUntilDate(dateStr: string | null, now: Date): number | null {
  if (!dateStr) return null;
  const parsed = parseLocalDate(dateStr) ?? parseISO(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return differenceInCalendarDays(endOfDay(parsed), now);
}

function monthsNeededForGap(fundingGap: number, monthlySurplus: number): number | null {
  if (fundingGap <= 0) return 0;
  if (monthlySurplus <= 0) return null;
  return Math.ceil(fundingGap / monthlySurplus);
}

function formatMonthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

function computeTimelinePercents(
  effectiveDeadline: string | null,
  now: Date,
  horizonMonths: number
): { start: number; end: number } {
  if (!effectiveDeadline) return { start: 0, end: 100 };
  const start = now.getTime();
  const horizonEnd = addMonths(now, horizonMonths).getTime();
  const span = Math.max(1, horizonEnd - start);
  const deadlineMs =
    (parseLocalDate(effectiveDeadline) ?? parseISO(effectiveDeadline)).getTime() || horizonEnd;
  const clamped = Math.min(Math.max(deadlineMs, start), horizonEnd);
  const endPercent = ((clamped - start) / span) * 100;
  return { start: 0, end: Math.round(endPercent) };
}

function computeBudgetCoverage(savings: number, totalNeed: number): number {
  if (totalNeed <= 0) return 100;
  return Math.min(100, (savings / totalNeed) * 100);
}

function computeDeadlineSpreadScore(clusterCount: number): number {
  return Math.max(0, 100 - clusterCount * 15);
}

function computeSurplusCoverage(
  monthlySurplus: number,
  horizonMonths: number,
  totalFundingGap: number
): number {
  if (totalFundingGap <= 0) return 100;
  if (monthlySurplus <= 0) return 0;
  const capacity = monthlySurplus * horizonMonths;
  return Math.min(100, (capacity / totalFundingGap) * 100);
}

function computeMilestoneCompletionRate(goals: Goal[]): number {
  let completed = 0;
  let total = 0;
  for (const goal of goals) {
    const progress = getMilestoneProgress(normalizeGoalMilestones(goal.milestones));
    completed += progress.completed;
    total += progress.total;
  }
  if (total === 0) return 100;
  return (completed / total) * 100;
}

export interface DeadlineCluster {
  windowStart: string;
  windowEnd: string;
  goalIds: string[];
}

export function detectDeadlineClusters(
  goals: Goal[],
  now: Date,
  windowDays = DEADLINE_CLUSTER_WINDOW_DAYS,
  minGoals = DEADLINE_CLUSTER_MIN_GOALS
): DeadlineCluster[] {
  const dated = getActiveGoals(goals)
    .map((g) => ({ id: g.id, date: resolveEffectiveDeadline(g, now) }))
    .filter((g): g is { id: string; date: string } => !!g.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const clusters: DeadlineCluster[] = [];
  let i = 0;
  while (i < dated.length) {
    const windowStart = dated[i].date;
    const startMs = (parseLocalDate(windowStart) ?? parseISO(windowStart)).getTime();
    const windowEndMs = startMs + windowDays * 24 * 60 * 60 * 1000;
    const inWindow: string[] = [];
    let j = i;
    while (j < dated.length) {
      const ms = (parseLocalDate(dated[j].date) ?? parseISO(dated[j].date)).getTime();
      if (ms <= windowEndMs) {
        inWindow.push(dated[j].id);
        j++;
      } else break;
    }
    if (inWindow.length >= minGoals) {
      clusters.push({
        windowStart,
        windowEnd: format(addDays(parseLocalDate(windowStart) ?? new Date(startMs), windowDays), 'yyyy-MM-dd'),
        goalIds: inWindow,
      });
    }
    i = Math.max(i + 1, j);
  }
  return clusters;
}

function buildWeeklyFocus(
  goals: Goal[],
  tasks: TaskNode[],
  now: Date,
  limit = DEFAULT_WEEKLY_FOCUS_LIMIT
): WeeklyFocusItem[] {
  const items: WeeklyFocusItem[] = [];
  const horizon = addDays(now, WEEKLY_FOCUS_HORIZON_DAYS);

  for (const goal of getActiveGoals(goals)) {
    for (const task of tasks.filter((t) => t.goalId === goal.id && !t.completed)) {
      if (!task.deadline) continue;
      const parsed = parseLocalDate(task.deadline) ?? parseISO(task.deadline);
      if (parsed < now || parsed > horizon) continue;
      items.push({
        goalId: goal.id,
        goalTitle: goal.title,
        title: task.title,
        kind: 'task',
        targetDate: task.deadline,
        isMagicWand: task.isMagicWand || goal.isMagicWand,
        daysUntil: differenceInCalendarDays(parsed, now),
      });
    }
    for (const milestone of normalizeGoalMilestones(goal.milestones).filter((m) => !m.completed)) {
      if (!milestone.targetDate) continue;
      const parsed = parseLocalDate(milestone.targetDate) ?? parseISO(milestone.targetDate);
      if (parsed < now || parsed > horizon) continue;
      items.push({
        goalId: goal.id,
        goalTitle: goal.title,
        title: milestone.title,
        kind: 'milestone',
        targetDate: milestone.targetDate,
        isMagicWand: goal.isMagicWand,
        daysUntil: differenceInCalendarDays(parsed, now),
      });
    }
  }

  return items
    .sort((a, b) => {
      if (a.isMagicWand !== b.isMagicWand) return a.isMagicWand ? -1 : 1;
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

function buildMonthlyFunding(
  goalRows: GoalPlanRow[],
  monthlySurplus: number,
  now: Date,
  horizonMonths: number
): MonthlyFundingSlice[] {
  if (goalRows.length === 0) return [];

  const slices: MonthlyFundingSlice[] = [];
  const remainingGap = new Map(goalRows.map((r) => [r.goalId, r.fundingGap]));

  for (let m = 0; m < horizonMonths; m++) {
    const monthDate = addMonths(startOfMonth(now), m);
    const monthKey = formatMonthKey(monthDate);
    const byGoalId: Record<string, number> = {};
    let surplusLeft = monthlySurplus;

    for (const row of goalRows) {
      const gap = remainingGap.get(row.goalId) ?? 0;
      if (gap <= 0 || surplusLeft <= 0) {
        byGoalId[row.goalId] = 0;
        continue;
      }
      const assign = Math.min(gap, surplusLeft);
      byGoalId[row.goalId] = assign;
      remainingGap.set(row.goalId, gap - assign);
      surplusLeft -= assign;
    }

    const total = Object.values(byGoalId).reduce((s, v) => s + v, 0);
    slices.push({
      month: monthKey,
      byGoalId,
      total,
      surplusAvailable: monthlySurplus,
    });

    if ([...remainingGap.values()].every((g) => g <= 0)) break;
  }

  return slices;
}

export function computeGoalReachPlan(
  input: GoalReachPlannerInput,
  now = new Date()
): GoalReachPlanSnapshot {
  const {
    goals,
    tasks,
    latestSavingsBalance,
    monthlySurplus,
    horizonMonths = DEFAULT_GOAL_REACH_HORIZON_MONTHS,
  } = input;

  const activeGoals = getActiveGoals(goals);
  const clusters = detectDeadlineClusters(activeGoals, now);
  const clusterGoalIds = new Set(clusters.flatMap((c) => c.goalIds));

  const preliminaryRows = activeGoals.map((goal) => {
    const taskCostTotal = sumTaskCostsForGoal(goal.id, tasks);
    const fundingNeed = Math.max(goal.budget || 0, taskCostTotal);
    return { goal, taskCostTotal, fundingNeed };
  });

  const totalFundingNeed = preliminaryRows.reduce((s, r) => s + r.fundingNeed, 0);
  const totalBudgetAllocated = activeGoals.reduce((s, g) => s + (g.budget || 0), 0);

  const goalRows: GoalPlanRow[] = preliminaryRows
    .map(({ goal, taskCostTotal, fundingNeed }) => {
      const allocatedSavings =
        totalFundingNeed > 0
          ? latestSavingsBalance * (fundingNeed / totalFundingNeed)
          : 0;
      const fundingGap = Math.max(0, fundingNeed - allocatedSavings);
      const effectiveDeadline = resolveEffectiveDeadline(goal, now);
      const timerTarget = getGoalTimerTarget(goal);
      const countdown = timerTarget
        ? computeGoalCountdown(timerTarget.date, now)
        : null;
      const daysToDeadline = daysUntilDate(effectiveDeadline, now);
      const monthsNeeded = monthsNeededForGap(fundingGap, monthlySurplus);
      const earliestFeasibleDeadline =
        monthsNeeded != null && monthsNeeded > 0
          ? format(addMonths(now, monthsNeeded), 'yyyy-MM-dd')
          : fundingGap <= 0
            ? effectiveDeadline
            : null;

      const atRiskReasons: PlannerConflictType[] = [];
      if (fundingGap > 0.01) atRiskReasons.push('funding_gap');
      if (countdown?.isOverdue) atRiskReasons.push('overdue');
      if (clusterGoalIds.has(goal.id)) atRiskReasons.push('deadline_cluster');
      if (
        effectiveDeadline &&
        monthsNeeded != null &&
        daysToDeadline != null &&
        daysToDeadline >= 0 &&
        monthsNeeded * 30 > daysToDeadline
      ) {
        atRiskReasons.push('funding_gap');
      }

      const timeline = computeTimelinePercents(effectiveDeadline, now, horizonMonths);

      return {
        goalId: goal.id,
        title: goal.title,
        effectiveDeadline,
        timerLabel: timerTarget?.label ?? null,
        taskCostTotal,
        fundingNeed,
        allocatedSavings,
        fundingGap,
        daysToDeadline,
        earliestFeasibleDeadline,
        atRisk: atRiskReasons.length > 0,
        atRiskReasons: [...new Set(atRiskReasons)],
        timelineStartPercent: timeline.start,
        timelineEndPercent: timeline.end,
        isMagicWand: goal.isMagicWand,
      };
    })
    .sort((a, b) => {
      const da = a.effectiveDeadline ?? '9999-12-31';
      const db = b.effectiveDeadline ?? '9999-12-31';
      return da.localeCompare(db);
    });

  const totalFundingGap = Math.max(0, totalFundingNeed - latestSavingsBalance);
  const savingsGap = Math.max(0, totalBudgetAllocated - latestSavingsBalance);

  const budgetCoverage = computeBudgetCoverage(latestSavingsBalance, totalFundingNeed);
  const deadlineSpread = computeDeadlineSpreadScore(clusters.length);
  const surplusCoverage = computeSurplusCoverage(
    monthlySurplus,
    horizonMonths,
    totalFundingGap
  );
  const milestoneCompletion = computeMilestoneCompletionRate(activeGoals);

  const feasibility = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        budgetCoverage * 0.4 +
          deadlineSpread * 0.3 +
          surplusCoverage * 0.2 +
          milestoneCompletion * 0.1
      )
    )
  );

  const conflicts: PlannerConflict[] = [];

  if (totalBudgetAllocated > latestSavingsBalance + 0.01) {
    conflicts.push({
      type: 'over_allocated_budgets',
      goalIds: activeGoals.map((g) => g.id),
      messageKey: 'goalReach.conflicts.overAllocated',
      messageParams: {
        allocated: totalBudgetAllocated,
        savings: latestSavingsBalance,
        gap: savingsGap,
      },
    });
  }

  for (const row of goalRows) {
    if (row.taskCostTotal > (activeGoals.find((g) => g.id === row.goalId)?.budget ?? 0) + 0.01) {
      conflicts.push({
        type: 'task_cost_exceeds_budget',
        goalIds: [row.goalId],
        messageKey: 'goalReach.conflicts.taskCostExceedsBudget',
        messageParams: {
          title: row.title,
          taskCost: row.taskCostTotal,
          budget: activeGoals.find((g) => g.id === row.goalId)?.budget ?? 0,
        },
      });
    }
  }

  for (const cluster of clusters) {
    const combinedNeed = goalRows
      .filter((r) => cluster.goalIds.includes(r.goalId))
      .reduce((s, r) => s + r.fundingNeed, 0);
    conflicts.push({
      type: 'deadline_cluster',
      goalIds: cluster.goalIds,
      messageKey: 'goalReach.conflicts.deadlineCluster',
      messageParams: {
        windowStart: cluster.windowStart,
        count: cluster.goalIds.length,
        combinedNeed,
      },
    });
  }

  for (const row of goalRows.filter((r) => r.atRiskReasons.includes('overdue'))) {
    conflicts.push({
      type: 'overdue',
      goalIds: [row.goalId],
      messageKey: 'goalReach.conflicts.overdue',
      messageParams: { title: row.title },
    });
  }

  for (const row of goalRows.filter(
    (r) => r.fundingGap > 0.01 && !r.atRiskReasons.includes('overdue')
  )) {
    if (!conflicts.some((c) => c.type === 'funding_gap' && c.goalIds.includes(row.goalId))) {
      conflicts.push({
        type: 'funding_gap',
        goalIds: [row.goalId],
        messageKey: 'goalReach.conflicts.fundingGap',
        messageParams: {
          title: row.title,
          gap: row.fundingGap,
          earliest: row.earliestFeasibleDeadline ?? '',
        },
      });
    }
  }

  let simulationCheckpoints: GoalFundingCheckpointResult[] = [];
  const { monthlyIncome, monthlyExpenses } = input;
  if (
    monthlyIncome != null &&
    monthlyExpenses != null &&
    (monthlyIncome > 0 || monthlyExpenses > 0)
  ) {
    const schedule = simulateGoalFundingSchedule(
      {
        monthlyIncome,
        monthlyExpenses,
        currentSavings: latestSavingsBalance,
        simulationMonths: horizonMonths,
        checkpoints: goalRows
          .filter((row) => row.effectiveDeadline)
          .map((row) => ({
            goalId: row.goalId,
            title: row.title,
            deadline: row.effectiveDeadline!,
            fundingNeed: row.fundingNeed,
          })),
      },
      now
    );
    simulationCheckpoints = schedule.checkpoints;

    for (const cp of schedule.checkpoints.filter((c) => c.atRisk)) {
      const row = goalRows.find((r) => r.goalId === cp.goalId);
      if (row && !row.atRiskReasons.includes('simulation_shortfall')) {
        row.atRiskReasons.push('simulation_shortfall');
        row.atRisk = true;
      }
      if (!conflicts.some((c) => c.type === 'simulation_shortfall' && c.goalIds.includes(cp.goalId))) {
        conflicts.push({
          type: 'simulation_shortfall',
          goalIds: [cp.goalId],
          messageKey: 'goalReach.conflicts.simulationShortfall',
          messageParams: {
            title: cp.title,
            deadline: cp.deadline,
            need: cp.fundingNeed,
            available: cp.availableSavings,
            shortfall: cp.shortfall,
            month: cp.simulationMonth,
          },
        });
      }
    }
  }

  return {
    computedAt: now.toISOString(),
    activeGoalCount: activeGoals.length,
    feasibility,
    feasibilityBreakdown: {
      budgetCoverage: Math.round(budgetCoverage),
      deadlineSpread: Math.round(deadlineSpread),
      surplusCoverage: Math.round(surplusCoverage),
      milestoneCompletion: Math.round(milestoneCompletion),
      total: feasibility,
    },
    totalFundingNeed,
    totalBudgetAllocated,
    savingsGap,
    goalRows,
    conflicts,
    monthlyFunding: buildMonthlyFunding(goalRows, monthlySurplus, now, horizonMonths),
    weeklyFocus: buildWeeklyFocus(activeGoals, tasks, now),
    simulationCheckpoints,
  };
}