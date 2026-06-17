import { useCallback, useState } from 'react';
import {
  normalizeGoalCoachSettings,
  readGoalCoachSettings,
  writeGoalCoachSettings,
} from '@/lib/goalCoachSettings';
import type { GoalCoachSettings } from '@/types/goalCoach';

export function useGoalCoachSettings() {
  const [settings, setSettingsState] = useState<GoalCoachSettings>(readGoalCoachSettings);

  const setSettings = useCallback((next: Partial<GoalCoachSettings>) => {
    setSettingsState((prev) => {
      const merged = normalizeGoalCoachSettings({ ...prev, ...next });
      writeGoalCoachSettings(merged);
      return merged;
    });
  }, []);

  return { settings, setSettings };
}