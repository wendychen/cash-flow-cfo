export const LONG_TERM_FIN_GOAL_HORIZON_YEARS = 20;

export interface LongTermFinGoal {
  targetAmount: number;
  endYear: number;
  horizonYears: typeof LONG_TERM_FIN_GOAL_HORIZON_YEARS;
  presetKey?: string;
  updatedAt: string;
}