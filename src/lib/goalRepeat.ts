import { addWeeks, addMonths, addQuarters, addYears, format } from 'date-fns';
import type { Goal } from '@/types/goal';
import type { GoalMilestone } from '@/types/goalMilestone';
import {
  type GoalRepeatInterval,
  isRepeatingGoal,
  normalizeRepeatInterval,
} from '@/types/goalRepeat';
import { parseLocalDate } from '@/lib/date';
import { normalizeGoalMilestones } from '@/lib/goalMilestones';

export function advanceDateByInterval(
  dateStr: string,
  interval: GoalRepeatInterval
): string {
  if (interval === 'none') return dateStr;

  const base = parseLocalDate(dateStr);
  if (!base) return dateStr;

  let next: Date;
  switch (interval) {
    case 'weekly':
      next = addWeeks(base, 1);
      break;
    case 'monthly':
      next = addMonths(base, 1);
      break;
    case 'quarterly':
      next = addQuarters(base, 1);
      break;
    case 'yearly':
      next = addYears(base, 1);
      break;
    default:
      return dateStr;
  }

  return format(next, 'yyyy-MM-dd');
}

export function shiftMilestonesForNextCycle(
  milestones: GoalMilestone[] | undefined,
  interval: GoalRepeatInterval
): GoalMilestone[] {
  return normalizeGoalMilestones(milestones).map((milestone) => ({
    ...milestone,
    id: crypto.randomUUID(),
    targetDate: advanceDateByInterval(milestone.targetDate, interval),
    completed: false,
    completedAt: undefined,
  }));
}

export interface NextCycleGoalFields {
  title: string;
  deadline: string;
  completed: false;
  isMagicWand: boolean;
  category: Goal['category'];
  budget: number;
  timeCost: string;
  ideations: Goal['ideations'];
  constraint: string;
  urlPack: string[];
  milestones: GoalMilestone[];
  repeatInterval: GoalRepeatInterval;
  repeatSeriesId: string;
  repeatCycle: number;
}

export function buildNextCycleGoalFields(source: Goal): NextCycleGoalFields | null {
  const interval = normalizeRepeatInterval(source.repeatInterval);
  if (!isRepeatingGoal(interval)) return null;

  const seriesId = source.repeatSeriesId ?? source.id;
  const nextCycle = (source.repeatCycle ?? 1) + 1;

  return {
    title: source.title,
    deadline: advanceDateByInterval(source.deadline, interval),
    completed: false,
    isMagicWand: source.isMagicWand,
    category: source.category,
    budget: source.budget,
    timeCost: source.timeCost,
    ideations: [...(source.ideations ?? [])],
    constraint: source.constraint,
    urlPack: [...(source.urlPack ?? [])],
    milestones: shiftMilestonesForNextCycle(source.milestones, interval),
    repeatInterval: interval,
    repeatSeriesId: seriesId,
    repeatCycle: nextCycle,
  };
}