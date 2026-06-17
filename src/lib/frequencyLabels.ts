import type { Frequency } from '@/types/fixedExpense';

export interface FrequencyMeta {
  label: string;
  shortHint: string;
  description: string;
}

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
      'Twice per month (~every 15 days). This is not “every 2 months.” Monthly equivalent ≈ amount × 2.',
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