import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import type { GoalPlanRow, MonthlyFundingSlice } from '@/lib/goalReachPlanner';

const CHART_MONTHS = 12;

const GOAL_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#22c55e',
  '#a855f7',
  '#06b6d4',
  '#eab308',
];

interface MonthlyFundingChartProps {
  monthlyFunding: MonthlyFundingSlice[];
  goalRows: GoalPlanRow[];
}

export default function MonthlyFundingChart({
  monthlyFunding,
  goalRows,
}: MonthlyFundingChartProps) {
  const { t } = useI18n();
  const { format: formatMoney } = useCurrency();

  const { chartData, goalKeys } = useMemo(() => {
    const slices = monthlyFunding.slice(0, CHART_MONTHS);
    const keys = goalRows.map((r) => r.goalId);

    const data = slices.map((slice) => {
      const row: Record<string, string | number> = {
        month: slice.month,
        monthLabel: format(parseISO(`${slice.month}-01`), 'MMM'),
        surplus: slice.surplusAvailable,
        unallocated: Math.max(0, slice.surplusAvailable - slice.total),
      };
      for (const goalId of keys) {
        row[goalId] = slice.byGoalId[goalId] ?? 0;
      }
      return row;
    });

    return { chartData: data, goalKeys: keys };
  }, [monthlyFunding, goalRows]);

  const goalTitleById = useMemo(
    () => new Map(goalRows.map((r) => [r.goalId, r.title])),
    [goalRows]
  );

  if (chartData.length === 0 || goalRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {t('goalReach.monthlyFunding.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{t('goalReach.monthlyFunding.title')}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatMoney(Number(v))}
              width={72}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'unallocated') {
                  return [formatMoney(value), t('goalReach.monthlyFunding.unallocated')];
                }
                if (name === 'surplus') return [formatMoney(value), t('goalReach.monthlyFunding.surplus')];
                return [formatMoney(value), goalTitleById.get(name) ?? name];
              }}
              labelFormatter={(_, payload) => {
                const month = payload?.[0]?.payload?.month as string | undefined;
                return month ?? '';
              }}
            />
            {goalKeys.map((goalId, index) => (
              <Bar
                key={goalId}
                dataKey={goalId}
                stackId="funding"
                fill={GOAL_COLORS[index % GOAL_COLORS.length]}
                radius={index === goalKeys.length - 1 ? [0, 0, 0, 0] : undefined}
              />
            ))}
            <Bar
              dataKey="unallocated"
              stackId="funding"
              fill="hsl(var(--muted))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {goalRows.slice(0, 8).map((row, index) => (
          <span key={row.goalId} className="flex items-center gap-1.5 max-w-[10rem]">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: GOAL_COLORS[index % GOAL_COLORS.length] }}
            />
            <span className="truncate">{row.title}</span>
          </span>
        ))}
        {goalRows.length > 8 && (
          <span>{t('goalReach.monthlyFunding.moreGoals', { count: goalRows.length - 8 })}</span>
        )}
      </div>
    </div>
  );
}