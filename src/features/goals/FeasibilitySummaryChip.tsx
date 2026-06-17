import { AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { FeasibilityBreakdown } from '@/lib/goalReachPlanner';

interface FeasibilitySummaryChipProps {
  feasibility: number;
  breakdown: FeasibilityBreakdown;
  activeGoalCount: number;
  atRiskCount: number;
  conflictCount?: number;
  onViewConflicts?: () => void;
}

function feasibilityTone(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function FeasibilitySummaryChip({
  feasibility,
  breakdown,
  activeGoalCount,
  atRiskCount,
  conflictCount = 0,
  onViewConflicts,
}: FeasibilitySummaryChipProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('goalReach.feasibility')}
          </p>
          <p className={cn('text-2xl font-bold tabular-nums', feasibilityTone(feasibility))}>
            {feasibility}%
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t('goalReach.goalCount', { count: activeGoalCount })}
          </span>
          {atRiskCount > 0 && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 cursor-pointer"
              onClick={onViewConflicts}
              role={onViewConflicts ? 'button' : undefined}
            >
              {t('goalReach.atRisk', { count: atRiskCount })}
            </Badge>
          )}
        </div>
      </div>

      {conflictCount > 0 && onViewConflicts && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={onViewConflicts}
        >
          <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
          {t('goalReach.conflictsPanel.view', { count: conflictCount })}
        </Button>
      )}

      <Progress value={feasibility} className="h-2" />

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground"
        title={t('goalReach.breakdownHint')}
      >
        <span>{t('goalReach.breakdown.budget', { score: breakdown.budgetCoverage })}</span>
        <span>{t('goalReach.breakdown.deadlines', { score: breakdown.deadlineSpread })}</span>
        <span>{t('goalReach.breakdown.surplus', { score: breakdown.surplusCoverage })}</span>
        <span>{t('goalReach.breakdown.milestones', { score: breakdown.milestoneCompletion })}</span>
      </div>
    </div>
  );
}