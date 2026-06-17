export interface GoalMilestone {
  id: string;
  title: string;
  /** Target date YYYY-MM-DD */
  targetDate: string;
  completed: boolean;
  completedAt?: string;
  note?: string;
}

export const MAX_MILESTONES_PER_GOAL = 12;