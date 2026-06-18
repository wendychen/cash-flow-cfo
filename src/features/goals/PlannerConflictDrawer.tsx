import { AlertTriangle, ExternalLink, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import {
  formatConflictDetail,
  getConflictTitleKey,
  suggestClusterDeadlineShift,
} from '@/lib/plannerConflictUtils';
import type { GoalPlanRow, PlannerConflict } from '@/lib/goalReachPlanner';

interface PlannerConflictDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: PlannerConflict[];
  goalRows: GoalPlanRow[];
  onOpenBudgetAllocator?: () => void;
  onOpenGoal?: (goalId: string) => void;
  onApplyDeadlineShift?: (goalId: string, newDeadline: string) => void;
}

export default function PlannerConflictDrawer({
  open,
  onOpenChange,
  conflicts,
  goalRows,
  onOpenBudgetAllocator,
  onOpenGoal,
  onApplyDeadlineShift,
}: PlannerConflictDrawerProps) {
  const { t } = useI18n();
  const { format } = useCurrency();

  const goalTitleById = new Map(goalRows.map((row) => [row.goalId, row.title]));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('goalReach.conflictsPanel.title')}
          </SheetTitle>
          <SheetDescription>
            {conflicts.length === 0
              ? t('goalReach.conflictsPanel.noConflicts')
              : t('goalReach.conflictsPanel.count', { count: conflicts.length })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('goalReach.conflictsPanel.noConflicts')}</p>
          ) : (
            conflicts.map((conflict, index) => {
              const primaryGoalId = conflict.goalIds[0];
              const clusterShift =
                conflict.type === 'deadline_cluster'
                  ? suggestClusterDeadlineShift(conflict, goalRows)
                  : null;
              const clusterAllLocked =
                conflict.type === 'deadline_cluster' &&
                !clusterShift &&
                conflict.goalIds.length > 0;

              return (
                <div
                  key={`${conflict.type}-${primaryGoalId}-${index}`}
                  className="rounded-lg border bg-card p-4 space-y-3"
                  data-testid={`planner-conflict-${conflict.type}`}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {t(getConflictTitleKey(conflict.type))}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatConflictDetail(conflict, format, t, goalTitleById)}
                    </p>
                  </div>

                  {clusterShift && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t('goalReach.conflicts.suggestShift', {
                        title: clusterShift.goalTitle,
                        date: clusterShift.newDeadline,
                      })}
                    </p>
                  )}

                  {clusterAllLocked && (
                    <p className="text-xs text-muted-foreground">
                      {t('goalReach.conflicts.allDeadlinesLocked')}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {conflict.type === 'over_allocated_budgets' && onOpenBudgetAllocator && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onOpenBudgetAllocator();
                          onOpenChange(false);
                        }}
                      >
                        <Target className="mr-2 h-3.5 w-3.5" />
                        {t('goalReach.conflicts.openBudgetAllocator')}
                      </Button>
                    )}

                    {clusterShift && onApplyDeadlineShift && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onApplyDeadlineShift(clusterShift.goalId, clusterShift.newDeadline);
                          onOpenChange(false);
                        }}
                      >
                        {t('goalReach.conflicts.applyShift', {
                          title: clusterShift.goalTitle,
                          date: clusterShift.newDeadline,
                        })}
                      </Button>
                    )}

                    {primaryGoalId && onOpenGoal && conflict.type !== 'over_allocated_budgets' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onOpenGoal(primaryGoalId);
                          onOpenChange(false);
                        }}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        {t('goalReach.conflicts.openGoal')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}