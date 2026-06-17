export type GoalRepeatInterval = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const GOAL_REPEAT_INTERVALS: GoalRepeatInterval[] = [
  'none',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

export function normalizeRepeatInterval(
  interval?: GoalRepeatInterval | null
): GoalRepeatInterval {
  return interval && interval !== 'none' ? interval : 'none';
}

export function isRepeatingGoal(interval?: GoalRepeatInterval | null): boolean {
  return normalizeRepeatInterval(interval) !== 'none';
}