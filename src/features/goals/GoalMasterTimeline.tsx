import { Wand2, Flag } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import type { GoalPlanRow } from '@/lib/goalReachPlanner';

interface GoalMasterTimelineProps {
  goalRows: GoalPlanRow[];
  horizonMonths: number;
}

function fundedPercent(row: GoalPlanRow): number {
  if (row.fundingNeed <= 0) return 100;
  return Math.min(100, (row.allocatedSavings / row.fundingNeed) * 100);
}

export default function GoalMasterTimeline({ goalRows, horizonMonths }: GoalMasterTimelineProps) {
  const { t } = useI18n();
  const { format } = useCurrency();

  if (goalRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {t('goalReach.timeline.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{t('goalReach.masterTimeline')}</h4>
        <span className="text-xs text-muted-foreground">
          {t('goalReach.horizonMonths', { count: horizonMonths })}
        </span>
      </div>

      <div className="space-y-3">
        {goalRows.map((row) => {
          const funded = fundedPercent(row);
          const barWidth = Math.max(4, row.timelineEndPercent);

          return (
            <div key={row.goalId} className="space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {row.isMagicWand && (
                  <Wand2 className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                )}
                <p className="text-sm font-medium truncate flex-1">{row.title}</p>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {row.effectiveDeadline ?? t('goalReach.noDeadline')}
                </span>
              </div>

              <div className="relative h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full overflow-hidden',
                    row.atRisk ? 'bg-amber-200/60 dark:bg-amber-900/30' : 'bg-violet-200/50 dark:bg-violet-900/30'
                  )}
                  style={{ width: `${barWidth}%` }}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      row.atRisk
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-violet-500'
                    )}
                    style={{ width: `${funded}%` }}
                  />
                </div>
                {row.effectiveDeadline && (
                  <Flag
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 text-foreground/70"
                    style={{ left: `calc(${barWidth}% - 6px)` }}
                    aria-hidden
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  {t('goalReach.timeline.funded', {
                    funded: format(row.allocatedSavings),
                    need: format(row.fundingNeed),
                  })}
                </span>
                {row.fundingGap > 0.01 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {t('goalReach.timeline.gap', { amount: format(row.fundingGap) })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1 border-t">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-violet-500" />
          {t('goalReach.legend.funded')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-6 rounded-full bg-muted" />
          {t('goalReach.legend.gap')}
        </span>
        <span className="flex items-center gap-1.5">
          <Flag className="h-3 w-3" />
          {t('goalReach.legend.deadline')}
        </span>
      </div>
    </div>
  );
}