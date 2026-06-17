import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Goal } from '@/types/goal';
import {
  GOAL_REPEAT_INTERVALS,
  type GoalRepeatInterval,
  isRepeatingGoal,
  normalizeRepeatInterval,
} from '@/types/goalRepeat';
import { useI18n } from '@/i18n';

const INTERVAL_LABEL_KEYS: Record<GoalRepeatInterval, string> = {
  none: 'goals.repeat.none',
  weekly: 'goals.repeat.weekly',
  monthly: 'goals.repeat.monthly',
  quarterly: 'goals.repeat.quarterly',
  yearly: 'goals.repeat.yearly',
};

interface GoalRepeatSectionProps {
  goal: Goal;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
  onSpawnNextCycle?: (goalId: string) => void;
}

export default function GoalRepeatSection({
  goal,
  onUpdateGoal,
  onSpawnNextCycle,
}: GoalRepeatSectionProps) {
  const { t } = useI18n();
  const interval = normalizeRepeatInterval(goal.repeatInterval);
  const cycle = goal.repeatCycle ?? 1;

  const handleIntervalChange = (value: GoalRepeatInterval) => {
    const updates: Partial<Omit<Goal, 'id'>> = {
      repeatInterval: value === 'none' ? undefined : value,
    };
    if (value !== 'none' && !goal.repeatSeriesId) {
      updates.repeatSeriesId = goal.id;
      updates.repeatCycle = 1;
    }
    if (value === 'none') {
      updates.repeatSeriesId = undefined;
      updates.repeatCycle = undefined;
    }
    onUpdateGoal(goal.id, updates);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RefreshCw className="h-4 w-4 text-teal-600 shrink-0" />
      <span className="text-sm font-medium">{t('goals.repeat.label')}</span>
      {cycle > 1 && (
        <Badge variant="secondary" className="text-xs">
          {t('goals.repeat.cycle', { count: cycle })}
        </Badge>
      )}
      <Select value={interval} onValueChange={(v) => handleIntervalChange(v as GoalRepeatInterval)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GOAL_REPEAT_INTERVALS.map((key) => (
            <SelectItem key={key} value={key}>
              {t(INTERVAL_LABEL_KEYS[key] as 'goals.repeat.none')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isRepeatingGoal(interval) && onSpawnNextCycle && !goal.completed && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onSpawnNextCycle(goal.id)}
        >
          {t('goals.repeat.spawnNow')}
        </Button>
      )}
    </div>
  );
}