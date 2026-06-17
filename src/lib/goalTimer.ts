import { parseISO, isValid, endOfDay } from 'date-fns';
import type { Goal } from '@/types/goal';
import { getNextMilestone, normalizeGoalMilestones } from '@/lib/goalMilestones';
import { parseLocalDate } from '@/lib/date';

export type TimerTargetKind = 'milestone' | 'deadline';

export interface GoalTimerTarget {
  date: string;
  kind: TimerTargetKind;
  label: string;
}

export interface GoalCountdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
  isToday: boolean;
  urgency: 'overdue' | 'today' | 'soon' | 'normal';
}

export function getGoalTimerTarget(goal: Goal): GoalTimerTarget | null {
  const milestones = normalizeGoalMilestones(goal.milestones);
  const nextMilestone = getNextMilestone(milestones);

  if (nextMilestone?.targetDate) {
    return {
      date: nextMilestone.targetDate,
      kind: 'milestone',
      label: nextMilestone.title,
    };
  }

  if (goal.deadline) {
    return {
      date: goal.deadline,
      kind: 'deadline',
      label: 'Goal deadline',
    };
  }

  return null;
}

function resolveTargetDate(dateStr: string): Date | null {
  return parseLocalDate(dateStr) ?? (() => {
    try {
      const parsed = parseISO(dateStr);
      return isValid(parsed) ? endOfDay(parsed) : null;
    } catch {
      return null;
    }
  })();
}

export function computeGoalCountdown(targetDate: string, now = new Date()): GoalCountdown | null {
  const target = resolveTargetDate(targetDate);
  if (!target) return null;

  const end = endOfDay(target);
  const totalMs = end.getTime() - now.getTime();
  const isOverdue = totalMs < 0;
  const absMs = Math.abs(totalMs);

  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

  const isToday = !isOverdue && days === 0;

  let urgency: GoalCountdown['urgency'] = 'normal';
  if (isOverdue) urgency = 'overdue';
  else if (isToday) urgency = 'today';
  else if (days <= 7) urgency = 'soon';

  return {
    totalMs,
    days,
    hours,
    minutes,
    isOverdue,
    isToday,
    urgency,
  };
}

export function formatGoalCountdown(countdown: GoalCountdown): string {
  if (countdown.isOverdue) {
    if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h overdue`;
    return `${countdown.hours}h ${countdown.minutes}m overdue`;
  }
  if (countdown.isToday) {
    if (countdown.hours > 0) return `${countdown.hours}h ${countdown.minutes}m left`;
    return `${countdown.minutes}m left`;
  }
  if (countdown.days > 0) return `${countdown.days}d ${countdown.hours}h left`;
  return `${countdown.hours}h ${countdown.minutes}m left`;
}

export function countdownUrgencyClass(urgency: GoalCountdown['urgency']): string {
  switch (urgency) {
    case 'overdue':
      return 'text-red-500';
    case 'today':
      return 'text-orange-500';
    case 'soon':
      return 'text-amber-500';
    default:
      return 'text-muted-foreground';
  }
}