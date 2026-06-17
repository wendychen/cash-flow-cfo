import type { GoalReachAiSuggestion } from '@/types/goalCoach';
import type { Goal } from '@/types/goal';
import { normalizeGoalMilestones } from '@/lib/goalMilestones';
import { MAX_MILESTONES_PER_GOAL } from '@/types/goalMilestone';

export interface GoalCoachApplySelection {
  applyReorder: boolean;
  deadlineShiftIds: string[];
  budgetAdjustmentIds: string[];
  newMilestoneKeys: string[];
}

function milestoneKey(goalId: string, title: string): string {
  return `${goalId}::${title}`;
}

export function applyGoalCoachSuggestion(
  suggestion: GoalReachAiSuggestion,
  selection: GoalCoachApplySelection,
  goals: Goal[],
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void
): number {
  let applied = 0;
  const goalById = new Map(goals.map((g) => [g.id, g]));

  if (selection.applyReorder && suggestion.reorder?.length) {
    for (const item of suggestion.reorder) {
      if (!goalById.has(item.goalId)) continue;
      onUpdateGoal(item.goalId, { plannerPriority: item.newPriority });
      applied++;
    }
  }

  for (const item of suggestion.deadlineShifts ?? []) {
    if (!selection.deadlineShiftIds.includes(item.goalId)) continue;
    if (!goalById.has(item.goalId)) continue;
    onUpdateGoal(item.goalId, { deadline: item.newDeadline });
    applied++;
  }

  for (const item of suggestion.budgetAdjustments ?? []) {
    if (!selection.budgetAdjustmentIds.includes(item.goalId)) continue;
    if (!goalById.has(item.goalId)) continue;
    onUpdateGoal(item.goalId, { budget: item.newBudget });
    applied++;
  }

  for (const item of suggestion.newMilestones ?? []) {
    const key = milestoneKey(item.goalId, item.title);
    if (!selection.newMilestoneKeys.includes(key)) continue;
    const goal = goalById.get(item.goalId);
    if (!goal) continue;
    const milestones = normalizeGoalMilestones(goal.milestones);
    if (milestones.length >= MAX_MILESTONES_PER_GOAL) continue;
    if (milestones.some((m) => m.title === item.title)) continue;
    onUpdateGoal(item.goalId, {
      milestones: [
        ...milestones,
        {
          id: crypto.randomUUID(),
          title: item.title,
          targetDate: item.targetDate,
          completed: false,
        },
      ],
    });
    applied++;
  }

  return applied;
}

export { milestoneKey };