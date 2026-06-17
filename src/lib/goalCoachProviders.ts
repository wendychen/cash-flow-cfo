import type { GoalCoachProvider } from '@/types/goalCoach';

export const GOAL_COACH_SETTINGS_STORAGE_KEY = 'cash-flow-cfo-goal-coach-settings';

export const DEFAULT_SERVER_MODEL = 'gemini-2.0-flash';

export const DEFAULT_BYOK_MODELS: Record<Exclude<GoalCoachProvider, 'server'>, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
};

export const GOAL_COACH_PROVIDER_OPTIONS: GoalCoachProvider[] = [
  'server',
  'gemini',
  'openai',
  'groq',
];

export function getDefaultModelForProvider(provider: GoalCoachProvider): string {
  if (provider === 'server') return DEFAULT_SERVER_MODEL;
  return DEFAULT_BYOK_MODELS[provider];
}