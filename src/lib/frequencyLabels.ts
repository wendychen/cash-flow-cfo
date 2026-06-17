import type { TranslationKey } from '@/i18n';
import type { Frequency } from '@/types/fixedExpense';

export interface FrequencyMeta {
  label: string;
  shortHint: string;
  description: string;
}

type TranslateFn = (key: TranslationKey) => string;

type FrequencyFieldKeys = {
  label: TranslationKey;
  shortHint: TranslationKey;
  description: TranslationKey;
};

export const FREQUENCY_I18N_KEYS: Record<Frequency, FrequencyFieldKeys> = {
  weekly: {
    label: 'frequency.weekly.label',
    shortHint: 'frequency.weekly.shortHint',
    description: 'frequency.weekly.description',
  },
  'bi-weekly': {
    label: 'frequency.biWeekly.label',
    shortHint: 'frequency.biWeekly.shortHint',
    description: 'frequency.biWeekly.description',
  },
  'bi-monthly': {
    label: 'frequency.biMonthly.label',
    shortHint: 'frequency.biMonthly.shortHint',
    description: 'frequency.biMonthly.description',
  },
  monthly: {
    label: 'frequency.monthly.label',
    shortHint: 'frequency.monthly.shortHint',
    description: 'frequency.monthly.description',
  },
  quarterly: {
    label: 'frequency.quarterly.label',
    shortHint: 'frequency.quarterly.shortHint',
    description: 'frequency.quarterly.description',
  },
  yearly: {
    label: 'frequency.yearly.label',
    shortHint: 'frequency.yearly.shortHint',
    description: 'frequency.yearly.description',
  },
  custom: {
    label: 'frequency.custom.label',
    shortHint: 'frequency.custom.shortHint',
    description: 'frequency.custom.description',
  },
};

/** English fallback metadata (tests and non-UI contexts). */
export const FREQUENCY_META: Record<Frequency, FrequencyMeta> = {
  weekly: {
    label: 'Weekly',
    shortHint: 'Every 7 days',
    description: 'Charged once per week. Monthly equivalent ≈ amount × 4.33.',
  },
  'bi-weekly': {
    label: 'Bi-weekly',
    shortHint: 'Every 2 weeks',
    description:
      'Charged every 14 days (e.g. paycheck cycle). Monthly equivalent ≈ amount × 2.17.',
  },
  'bi-monthly': {
    label: 'Bi-monthly',
    shortHint: 'Twice per month',
    description:
      'Twice per month (~every 15 days). This is not "every 2 months." Monthly equivalent ≈ amount × 2.',
  },
  monthly: {
    label: 'Monthly',
    shortHint: 'Once per month',
    description: 'Charged once per calendar month.',
  },
  quarterly: {
    label: 'Quarterly',
    shortHint: 'Every 3 months',
    description: 'Charged four times per year. Monthly equivalent ≈ amount ÷ 3.',
  },
  yearly: {
    label: 'Yearly',
    shortHint: 'Once per year',
    description: 'Charged once per year. Monthly equivalent ≈ amount ÷ 12.',
  },
  custom: {
    label: 'Custom',
    shortHint: 'Custom interval',
    description: 'Uses a custom day interval you define.',
  },
};

export const STANDARD_FREQUENCIES: Frequency[] = [
  'weekly',
  'bi-weekly',
  'bi-monthly',
  'monthly',
  'quarterly',
  'yearly',
];

export function getFrequencyMeta(frequency: Frequency, t: TranslateFn): FrequencyMeta {
  const keys = FREQUENCY_I18N_KEYS[frequency];
  if (!keys) return FREQUENCY_META[frequency];
  return {
    label: t(keys.label),
    shortHint: t(keys.shortHint),
    description: t(keys.description),
  };
}