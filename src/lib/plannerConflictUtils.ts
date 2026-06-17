import { addDays, format, parseISO } from 'date-fns';
import type { TranslationKey } from '@/i18n';
import { parseLocalDate } from '@/lib/date';
import type { GoalPlanRow, PlannerConflict, PlannerConflictType } from '@/lib/goalReachPlanner';

const CONFLICT_TITLE_KEYS: Record<PlannerConflictType, TranslationKey> = {
  over_allocated_budgets: 'goalReach.conflicts.overAllocated',
  task_cost_exceeds_budget: 'goalReach.conflicts.taskCostExceedsBudget',
  deadline_cluster: 'goalReach.conflicts.deadlineCluster',
  funding_gap: 'goalReach.conflicts.fundingGap',
  overdue: 'goalReach.conflicts.overdue',
};

export function getConflictTitleKey(type: PlannerConflictType): TranslationKey {
  return CONFLICT_TITLE_KEYS[type];
}

export function formatConflictDetail(
  conflict: PlannerConflict,
  formatMoney: (amount: number) => string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  goalTitleById: Map<string, string>
): string {
  const params = conflict.messageParams ?? {};

  switch (conflict.type) {
    case 'over_allocated_budgets':
      return t('goalReach.conflicts.overAllocatedDetail', {
        allocated: formatMoney(Number(params.allocated ?? 0)),
        savings: formatMoney(Number(params.savings ?? 0)),
        gap: formatMoney(Number(params.gap ?? 0)),
      });
    case 'task_cost_exceeds_budget':
      return t('goalReach.conflicts.taskCostExceedsBudgetDetail', {
        title: String(params.title ?? ''),
        taskCost: formatMoney(Number(params.taskCost ?? 0)),
        budget: formatMoney(Number(params.budget ?? 0)),
      });
    case 'deadline_cluster': {
      const names = conflict.goalIds
        .map((id) => goalTitleById.get(id))
        .filter(Boolean)
        .join(', ');
      return [
        t('goalReach.conflicts.deadlineClusterDetail', {
          count: Number(params.count ?? conflict.goalIds.length),
          windowStart: String(params.windowStart ?? ''),
          combinedNeed: formatMoney(Number(params.combinedNeed ?? 0)),
        }),
        names
          ? t('goalReach.conflicts.deadlineClusterGoals', { names })
          : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
    case 'funding_gap':
      return t('goalReach.conflicts.fundingGapDetail', {
        title: String(params.title ?? ''),
        gap: formatMoney(Number(params.gap ?? 0)),
        earliest: String(params.earliest ?? t('goalReach.conflicts.unknownEarliest')),
      });
    case 'overdue':
      return t('goalReach.conflicts.overdueDetail', {
        title: String(params.title ?? ''),
      });
    default:
      return '';
  }
}

export function suggestClusterDeadlineShift(
  conflict: PlannerConflict,
  goalRows: GoalPlanRow[]
): { goalId: string; goalTitle: string; newDeadline: string } | null {
  if (conflict.type !== 'deadline_cluster' || conflict.goalIds.length === 0) {
    return null;
  }

  const inCluster = goalRows.filter((row) => conflict.goalIds.includes(row.goalId));
  if (inCluster.length === 0) return null;

  const candidates = inCluster.filter((row) => !row.isMagicWand);
  const pool = candidates.length > 0 ? candidates : inCluster;
  const target = [...pool].sort((a, b) =>
    (b.effectiveDeadline ?? '').localeCompare(a.effectiveDeadline ?? '')
  )[0];

  if (!target?.effectiveDeadline) return null;

  const baseDate =
    parseLocalDate(target.effectiveDeadline) ?? parseISO(target.effectiveDeadline);
  if (Number.isNaN(baseDate.getTime())) return null;

  return {
    goalId: target.goalId,
    goalTitle: target.title,
    newDeadline: format(addDays(baseDate, 60), 'yyyy-MM-dd'),
  };
}