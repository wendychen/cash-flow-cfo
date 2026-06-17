import type { TranslationKey } from '@/i18n';
import type { GoalRepeatInterval } from '@/types/goalRepeat';

type TranslateFn = (key: TranslationKey) => string;

const GOAL_REPEAT_I18N_KEYS: Record<GoalRepeatInterval, TranslationKey> = {
  none: 'goals.repeat.none',
  weekly: 'goals.repeat.weekly',
  monthly: 'goals.repeat.monthly',
  quarterly: 'goals.repeat.quarterly',
  yearly: 'goals.repeat.yearly',
};

export function getGoalRepeatLabel(interval: GoalRepeatInterval, t: TranslateFn): string {
  const key = GOAL_REPEAT_I18N_KEYS[interval];
  return key ? t(key) : interval;
}