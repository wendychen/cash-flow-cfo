import {
  getDefaultModelForProvider,
  GOAL_COACH_SETTINGS_STORAGE_KEY,
} from '@/lib/goalCoachProviders';
import type {
  GoalCoachProvider,
  GoalCoachProviderSettings,
  GoalCoachSettings,
} from '@/types/goalCoach';

const VALID_PROVIDERS: GoalCoachProvider[] = ['server', 'gemini', 'openai', 'groq'];

export function normalizeGoalCoachSettings(raw: unknown): GoalCoachSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<GoalCoachSettings>;
  const provider = VALID_PROVIDERS.includes(input.provider as GoalCoachProvider)
    ? (input.provider as GoalCoachProvider)
    : 'server';

  const apiKey =
    typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : undefined;
  const model =
    typeof input.model === 'string' && input.model.trim() ? input.model.trim() : undefined;

  return { provider, apiKey, model };
}

export function readGoalCoachSettings(): GoalCoachSettings {
  try {
    const saved = localStorage.getItem(GOAL_COACH_SETTINGS_STORAGE_KEY);
    if (!saved) return { provider: 'server' };
    return normalizeGoalCoachSettings(JSON.parse(saved));
  } catch {
    return { provider: 'server' };
  }
}

export function writeGoalCoachSettings(settings: GoalCoachSettings): void {
  try {
    const normalized = normalizeGoalCoachSettings(settings);
    localStorage.setItem(GOAL_COACH_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function isByokProvider(provider: GoalCoachProvider): boolean {
  return provider !== 'server';
}

export function isCoachReadyForRequest(settings: GoalCoachSettings): boolean {
  if (!isByokProvider(settings.provider)) return true;
  return !!settings.apiKey?.trim();
}

export function toProviderSettingsPayload(
  settings: GoalCoachSettings
): GoalCoachProviderSettings {
  const normalized = normalizeGoalCoachSettings(settings);
  const payload: GoalCoachProviderSettings = { provider: normalized.provider };

  if (normalized.apiKey) payload.apiKey = normalized.apiKey;
  if (normalized.model) payload.model = normalized.model;

  return payload;
}

export function resolvedModelLabel(settings: GoalCoachSettings): string {
  return settings.model?.trim() || getDefaultModelForProvider(settings.provider);
}