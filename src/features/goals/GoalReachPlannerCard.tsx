import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Route, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import {
  computeGoalReachPlan,
  DEFAULT_GOAL_REACH_HORIZON_MONTHS,
} from '@/lib/goalReachPlanner';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';
import FeasibilitySummaryChip from './FeasibilitySummaryChip';
import GoalMasterTimeline from './GoalMasterTimeline';
import MonthlyFundingChart from './MonthlyFundingChart';
import PlannerConflictDrawer from './PlannerConflictDrawer';
import WeeklyFocusList from './WeeklyFocusList';
import GoalCoachDialog from './GoalCoachDialog';

interface GoalReachPlannerCardProps {
  goals: Goal[];
  tasks: TaskNode[];
  latestSavingsBalance: number;
  monthlySurplus: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  longTermFinGoal?: LongTermFinGoal | null;
  onOpenBudgetAllocator?: () => void;
  onOpenGoal?: (goalId: string) => void;
  onApplyDeadlineShift?: (goalId: string, newDeadline: string) => void;
  onUpdateGoal?: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
}

export default function GoalReachPlannerCard({
  goals,
  tasks,
  latestSavingsBalance,
  monthlySurplus,
  monthlyIncome,
  monthlyExpenses,
  longTermFinGoal = null,
  onOpenBudgetAllocator,
  onOpenGoal,
  onApplyDeadlineShift,
  onUpdateGoal,
}: GoalReachPlannerCardProps) {
  const { t } = useI18n();
  const { format } = useCurrency();
  const [now, setNow] = useState(() => new Date());
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  const plan = useMemo(
    () =>
      computeGoalReachPlan(
        {
          goals,
          tasks,
          latestSavingsBalance,
          monthlySurplus,
          longTermFinGoal,
          horizonMonths: DEFAULT_GOAL_REACH_HORIZON_MONTHS,
          monthlyIncome,
          monthlyExpenses,
        },
        now
      ),
    [
      goals,
      tasks,
      latestSavingsBalance,
      monthlySurplus,
      monthlyIncome,
      monthlyExpenses,
      longTermFinGoal,
      now,
    ]
  );

  const atRiskCount = plan.goalRows.filter((r) => r.atRisk).length;
  const simulationShortfallCount = plan.simulationCheckpoints.filter((c) => c.atRisk).length;
  const showConflicts = plan.conflicts.length > 0 || plan.feasibility < 100 || atRiskCount > 0;

  useEffect(() => {
    if (!showConflicts) setConflictsOpen(false);
  }, [showConflicts]);

  if (plan.activeGoalCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('goalReach.empty')}</p>
        <p className="text-xs mt-1">{t('goalReach.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="goal-reach-planner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-foreground">{t('goalReach.title')}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUpdateGoal && (
            <Button type="button" variant="outline" size="sm" onClick={() => setCoachOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
              {t('goalReach.aiCoach.menu')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNow(new Date())}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('goalReach.refresh')}
          </Button>
        </div>
      </div>

      <FeasibilitySummaryChip
        feasibility={plan.feasibility}
        breakdown={plan.feasibilityBreakdown}
        activeGoalCount={plan.activeGoalCount}
        atRiskCount={atRiskCount}
        conflictCount={plan.conflicts.length}
        onViewConflicts={
          plan.conflicts.length > 0 ? () => setConflictsOpen(true) : undefined
        }
      />

      <WeeklyFocusList items={plan.weeklyFocus} onOpenGoal={onOpenGoal} />

      {plan.savingsGap > 0.01 && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t('goalReach.savingsGap', { amount: format(plan.savingsGap) })}
        </p>
      )}

      {plan.totalFundingNeed > latestSavingsBalance + 0.01 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t('goalReach.fundingGapTotal', {
            amount: format(plan.totalFundingNeed - latestSavingsBalance),
          })}
        </p>
      )}

      {simulationShortfallCount > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t('goalReach.simulation.shortfallSummary', { count: simulationShortfallCount })}
        </p>
      )}

      <GoalMasterTimeline
        goalRows={plan.goalRows}
        horizonMonths={DEFAULT_GOAL_REACH_HORIZON_MONTHS}
      />

      <MonthlyFundingChart
        monthlyFunding={plan.monthlyFunding}
        goalRows={plan.goalRows}
      />

      <PlannerConflictDrawer
        open={conflictsOpen}
        onOpenChange={setConflictsOpen}
        conflicts={plan.conflicts}
        goalRows={plan.goalRows}
        onOpenBudgetAllocator={onOpenBudgetAllocator}
        onOpenGoal={onOpenGoal}
        onApplyDeadlineShift={onApplyDeadlineShift}
      />

      {onUpdateGoal && (
        <GoalCoachDialog
          open={coachOpen}
          onOpenChange={setCoachOpen}
          goals={goals}
          tasks={tasks}
          plan={plan}
          cashSummary={{
            savings: latestSavingsBalance,
            monthlySurplus,
            monthlyIncome,
            monthlyExpenses,
          }}
          longTermFinGoal={longTermFinGoal}
          onUpdateGoal={onUpdateGoal}
        />
      )}
    </div>
  );
}