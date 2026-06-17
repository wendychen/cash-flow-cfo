export interface GoalCoachGoalPayload {
  id: string;
  title: string;
  deadline: string;
  budget: number;
  fundingNeed: number;
  constraint?: string;
  plannerPriority?: number;
  plannedStartDate?: string;
  isMagicWand: boolean;
  milestoneCount: number;
  incompleteMilestones: number;
  taskCostTotal: number;
}

export interface GoalCoachCashSummary {
  savings: number;
  monthlySurplus: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

export interface GoalCoachConflictSummary {
  type: string;
  goalIds: string[];
}

export interface GoalCoachRequestBody {
  prompt: string;
  locale?: string;
  includeConstraints?: boolean;
  includeCashFlow?: boolean;
  goals: GoalCoachGoalPayload[];
  cashSummary: GoalCoachCashSummary;
  feasibility?: number;
  conflicts?: GoalCoachConflictSummary[];
  finGoal?: {
    targetAmount: number;
    endYear: number;
  };
}

export interface GoalReachAiSuggestion {
  summary: string;
  reorder?: { goalId: string; newPriority: number }[];
  deadlineShifts?: { goalId: string; newDeadline: string; reason: string }[];
  budgetAdjustments?: { goalId: string; newBudget: number; reason: string }[];
  newMilestones?: { goalId: string; title: string; targetDate: string }[];
  weeklyFocus?: { goalId: string; taskOrMilestoneTitle: string }[];
}

export interface GoalCoachSuccessResponse {
  suggestion: GoalReachAiSuggestion;
  model: string;
}

export interface GoalCoachErrorResponse {
  error: string;
  code?: string;
}