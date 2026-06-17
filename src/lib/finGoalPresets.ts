import type { TranslationKey } from '@/i18n';
import { LONG_TERM_FIN_GOAL_HORIZON_YEARS } from '@/types/longTermFinGoal';

export const FIN_GOAL_PRESET_CUSTOM = 'custom' as const;

export interface FinGoalPreset {
  key: string;
  amount: number;
  labelKey: TranslationKey;
}

export const FIN_GOAL_PRESETS: FinGoalPreset[] = [
  { key: '500T', amount: 500e12, labelKey: 'finGoal.presets.500T' },
  { key: '100T', amount: 100e12, labelKey: 'finGoal.presets.100T' },
  { key: '50T', amount: 50e12, labelKey: 'finGoal.presets.50T' },
  { key: '25T', amount: 25e12, labelKey: 'finGoal.presets.25T' },
  { key: '10T', amount: 10e12, labelKey: 'finGoal.presets.10T' },
  { key: '5T', amount: 5e12, labelKey: 'finGoal.presets.5T' },
  { key: '1T', amount: 1e12, labelKey: 'finGoal.presets.1T' },
  { key: '500B', amount: 500e9, labelKey: 'finGoal.presets.500B' },
  { key: '100B', amount: 100e9, labelKey: 'finGoal.presets.100B' },
  { key: '50B', amount: 50e9, labelKey: 'finGoal.presets.50B' },
  { key: '25B', amount: 25e9, labelKey: 'finGoal.presets.25B' },
  { key: '10B', amount: 10e9, labelKey: 'finGoal.presets.10B' },
  { key: '5B', amount: 5e9, labelKey: 'finGoal.presets.5B' },
  { key: '1B', amount: 1e9, labelKey: 'finGoal.presets.1B' },
  { key: '500M', amount: 500e6, labelKey: 'finGoal.presets.500M' },
  { key: '100M', amount: 100e6, labelKey: 'finGoal.presets.100M' },
  { key: '50M', amount: 50e6, labelKey: 'finGoal.presets.50M' },
  { key: '25M', amount: 25e6, labelKey: 'finGoal.presets.25M' },
  { key: '10M', amount: 10e6, labelKey: 'finGoal.presets.10M' },
  { key: '5M', amount: 5e6, labelKey: 'finGoal.presets.5M' },
  { key: '1M', amount: 1e6, labelKey: 'finGoal.presets.1M' },
  { key: '100K', amount: 100e3, labelKey: 'finGoal.presets.100K' },
];

export function getFinGoalPresetByKey(key: string): FinGoalPreset | undefined {
  return FIN_GOAL_PRESETS.find((preset) => preset.key === key);
}

export function getFinGoalPresetByAmount(amount: number): FinGoalPreset | undefined {
  return FIN_GOAL_PRESETS.find((preset) => preset.amount === amount);
}

export function getDefaultFinGoalEndYear(anchorYear = new Date().getFullYear()): number {
  return anchorYear + LONG_TERM_FIN_GOAL_HORIZON_YEARS;
}

export function computeFinGoalProgress(currentAmount: number, targetAmount: number): number {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0;
  if (!Number.isFinite(currentAmount) || currentAmount <= 0) return 0;
  return Math.min(100, Math.round((currentAmount / targetAmount) * 1000) / 10);
}

export function getFinGoalYearsRemaining(endYear: number, nowYear = new Date().getFullYear()): number {
  return Math.max(0, endYear - nowYear);
}