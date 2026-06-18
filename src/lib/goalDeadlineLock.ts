import type { Goal } from '@/types/goal';

/** Deadlines are hard-locked unless the user explicitly sets `deadlineLocked: false`. */
export function isGoalDeadlineLocked(goal: Pick<Goal, 'deadlineLocked'>): boolean {
  return goal.deadlineLocked !== false;
}

export function goalIdsWithLockedDeadlines(goals: Pick<Goal, 'id' | 'deadlineLocked'>[]): Set<string> {
  return new Set(goals.filter((g) => isGoalDeadlineLocked(g)).map((g) => g.id));
}