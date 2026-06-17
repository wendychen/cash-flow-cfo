import type {
  GoalCoachErrorResponse,
  GoalCoachRequestBody,
  GoalCoachSuccessResponse,
} from '@/types/goalCoach';

export const GOAL_COACH_API_PATH = '/api/goal-coach';

export async function requestGoalCoach(
  body: GoalCoachRequestBody,
  options: { signal?: AbortSignal } = {}
): Promise<GoalCoachSuccessResponse> {
  const response = await fetch(GOAL_COACH_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const data = (await response.json()) as GoalCoachSuccessResponse | GoalCoachErrorResponse;

  if (!response.ok) {
    const err = data as GoalCoachErrorResponse;
    throw new Error(err.error || `Coach API error ${response.status}`);
  }

  return data as GoalCoachSuccessResponse;
}