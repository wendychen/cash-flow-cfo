import { useState } from 'react';
import { Target, Pencil, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { useCurrency } from '@/hooks/use-currency';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';
import { LONG_TERM_FIN_GOAL_HORIZON_YEARS } from '@/types/longTermFinGoal';
import {
  computeFinGoalProgress,
  getDefaultFinGoalEndYear,
  getFinGoalPresetByAmount,
  getFinGoalPresetByKey,
  getFinGoalYearsRemaining,
} from '@/lib/finGoalPresets';
import FinGoalAmountSelect from './FinGoalAmountSelect';

interface LongTermFinGoalCardProps {
  goal: LongTermFinGoal | null;
  currentSavings: number;
  onSetGoal: (goal: LongTermFinGoal) => void;
  onClearGoal: () => void;
}

export default function LongTermFinGoalCard({
  goal,
  currentSavings,
  onSetGoal,
  onClearGoal,
}: LongTermFinGoalCardProps) {
  const { t } = useI18n();
  const { format } = useCurrency();
  const [editing, setEditing] = useState(!goal);

  const progress = goal ? computeFinGoalProgress(currentSavings, goal.targetAmount) : 0;
  const yearsLeft = goal ? getFinGoalYearsRemaining(goal.endYear) : LONG_TERM_FIN_GOAL_HORIZON_YEARS;

  const targetLabel = goal
    ? (() => {
        const preset =
          (goal.presetKey && getFinGoalPresetByKey(goal.presetKey)) ||
          getFinGoalPresetByAmount(goal.targetAmount);
        return preset ? t(preset.labelKey) : format(goal.targetAmount);
      })()
    : null;

  const handleApply = (amountNtd: number, presetKey?: string) => {
    onSetGoal({
      targetAmount: amountNtd,
      endYear: getDefaultFinGoalEndYear(),
      horizonYears: LONG_TERM_FIN_GOAL_HORIZON_YEARS,
      presetKey,
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  };

  return (
    <div
      className="bg-card rounded-xl shadow-card p-4 w-full space-y-3"
      data-testid="long-term-fin-goal-card"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t('finGoal.title')}</span>
        </div>
        {goal && !editing && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              aria-label={t('finGoal.edit')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onClearGoal}
              aria-label={t('finGoal.clear')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {goal && !editing ? (
        <div className="space-y-2">
          <div>
            <p className="text-[11px] text-muted-foreground">{t('finGoal.target')}</p>
            <p className="text-sm font-semibold text-primary tabular-nums">{targetLabel}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>
                {t('finGoal.current')}: {format(currentSavings)}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t('finGoal.byYear', { year: goal.endYear, years: yearsLeft })}
          </p>
        </div>
      ) : (
        <FinGoalAmountSelect
          initialPresetKey={goal?.presetKey}
          onApply={handleApply}
        />
      )}
    </div>
  );
}