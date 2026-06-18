import { z } from 'zod';
import type { GoalReachAiSuggestion } from '@/types/goalCoach';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const goalReachAiSuggestionSchema = z.object({
  summary: z.string().min(1).max(4000),
  reorder: z
    .array(
      z.object({
        goalId: z.string().min(1),
        newPriority: z.number().int().min(1).max(99),
      })
    )
    .optional(),
  deadlineShifts: z
    .array(
      z.object({
        goalId: z.string().min(1),
        newDeadline: dateString,
        reason: z.string().max(500),
      })
    )
    .optional(),
  budgetAdjustments: z
    .array(
      z.object({
        goalId: z.string().min(1),
        newBudget: z.number().finite().nonnegative(),
        reason: z.string().max(500),
      })
    )
    .optional(),
  newMilestones: z
    .array(
      z.object({
        goalId: z.string().min(1),
        title: z.string().min(1).max(200),
        targetDate: dateString,
      })
    )
    .optional(),
  weeklyFocus: z
    .array(
      z.object({
        goalId: z.string().min(1),
        taskOrMilestoneTitle: z.string().min(1).max(200),
      })
    )
    .optional(),
});

export function parseGoalReachAiSuggestion(raw: unknown): GoalReachAiSuggestion | null {
  const parsed = goalReachAiSuggestionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function filterSuggestionToKnownGoals(
  suggestion: GoalReachAiSuggestion,
  goalIds: Set<string>,
  lockedDeadlineGoalIds: Set<string> = new Set()
): GoalReachAiSuggestion {
  const keep = <T extends { goalId: string }>(items: T[] | undefined) =>
    items?.filter((item) => goalIds.has(item.goalId));

  const keepUnlockedShifts = suggestion.deadlineShifts?.filter(
    (item) => goalIds.has(item.goalId) && !lockedDeadlineGoalIds.has(item.goalId)
  );

  return {
    summary: suggestion.summary,
    reorder: keep(suggestion.reorder),
    deadlineShifts: keepUnlockedShifts?.length ? keepUnlockedShifts : undefined,
    budgetAdjustments: keep(suggestion.budgetAdjustments),
    newMilestones: keep(suggestion.newMilestones),
    weeklyFocus: keep(suggestion.weeklyFocus),
  };
}