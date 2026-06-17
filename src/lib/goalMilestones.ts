import { parseISO, isValid } from 'date-fns';
import type { GoalMilestone } from '@/types/goalMilestone';

export interface MilestoneTimelinePoint {
  milestone: GoalMilestone;
  positionPercent: number;
}

function parseDateSafe(value: string): Date | null {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeGoalMilestones(milestones?: GoalMilestone[]): GoalMilestone[] {
  return milestones ?? [];
}

export function sortMilestonesByDate(milestones: GoalMilestone[]): GoalMilestone[] {
  return [...milestones].sort((a, b) => {
    const da = parseDateSafe(a.targetDate)?.getTime() ?? 0;
    const db = parseDateSafe(b.targetDate)?.getTime() ?? 0;
    return da - db;
  });
}

export function getMilestoneProgress(milestones: GoalMilestone[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getNextMilestone(milestones: GoalMilestone[]): GoalMilestone | null {
  const sorted = sortMilestonesByDate(milestones.filter((m) => !m.completed));
  return sorted[0] ?? null;
}

/** Map milestones to 0–100% positions between timeline start and end. */
export function getMilestoneTimelinePoints(
  milestones: GoalMilestone[],
  startDate: string,
  endDate: string
): MilestoneTimelinePoint[] {
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return milestones.map((milestone) => ({ milestone, positionPercent: 50 }));
  }

  const span = end.getTime() - start.getTime();

  return sortMilestonesByDate(milestones).map((milestone) => {
    const target = parseDateSafe(milestone.targetDate);
    if (!target) {
      return { milestone, positionPercent: 0 };
    }
    const clamped = Math.min(Math.max(target.getTime(), start.getTime()), end.getTime());
    const positionPercent = ((clamped - start.getTime()) / span) * 100;
    return { milestone, positionPercent };
  });
}

export function toggleMilestoneCompletion(
  milestones: GoalMilestone[],
  milestoneId: string
): GoalMilestone[] {
  return milestones.map((m) =>
    m.id === milestoneId
      ? {
          ...m,
          completed: !m.completed,
          completedAt: !m.completed ? new Date().toISOString() : undefined,
        }
      : m
  );
}