import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import {
  buildSimulationChartData,
  LONG_TERM_SIMULATOR_MONTHS,
  runCashFlowSimulation,
} from '@/lib/cashFlowSimulation';
import { Sparkles } from 'lucide-react';

interface CashFlowSimulatorProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  finGoalTargetAmount?: number | null;
}

const SHORT_HORIZONS = [3, 6, 12, 24] as const;

function formatChartLabel(
  month: number,
  horizon: number,
  t: (key: 'simulator.monthLabel' | 'simulator.yearLabel', params: Record<string, number>) => string
): string {
  if (horizon > 24) {
    if (month % 12 === 0 || month === horizon) {
      return t('simulator.yearLabel', { year: Math.ceil(month / 12) });
    }
    return '';
  }
  return t('simulator.monthLabel', { count: month });
}

export default function CashFlowSimulator({
  monthlyIncome,
  monthlyExpenses,
  currentSavings,
  finGoalTargetAmount,
}: CashFlowSimulatorProps) {
  const { format, convert, symbol } = useCurrency();
  const { t } = useI18n();
  const [incomeChange, setIncomeChange] = useState('0');
  const [expenseChange, setExpenseChange] = useState('0');
  const [months, setMonths] = useState<string>('12');

  const horizon = parseInt(months, 10) || 12;
  const showFinGoal = finGoalTargetAmount != null && finGoalTargetAmount > 0;

  const result = useMemo(() => {
    const incomeDelta = parseFloat(incomeChange) || 0;
    const expenseDelta = parseFloat(expenseChange) || 0;

    return runCashFlowSimulation({
      monthlyIncome,
      monthlyExpenses,
      currentSavings,
      incomeChange: incomeDelta,
      expenseChange: expenseDelta,
      months: horizon,
    });
  }, [monthlyIncome, monthlyExpenses, currentSavings, incomeChange, expenseChange, horizon]);

  const chartData = useMemo(
    () =>
      buildSimulationChartData(result.months).map((point) => ({
        ...point,
        label: formatChartLabel(point.month, horizon, t),
      })),
    [result.months, horizon, t]
  );

  const tableRows = useMemo(() => {
    if (horizon <= 24) return result.months;
    return result.months.filter((row) => row.month % 12 === 0 || row.month === horizon);
  }, [result.months, horizon]);

  const goalGap = showFinGoal ? finGoalTargetAmount - result.endingSavings : null;

  if (monthlyIncome === 0 && monthlyExpenses === 0) {
    return null;
  }

  const formatDelta = (value: number) => `${value >= 0 ? '+' : ''}${format(value)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          {t('charts.simulator')}
        </CardTitle>
        <CardDescription>{t('charts.simulatorHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sim-income">{t('simulator.incomeChange')}</Label>
            <Input
              id="sim-income"
              type="number"
              value={incomeChange}
              onChange={(e) => setIncomeChange(e.target.value)}
              step="100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-expense">{t('simulator.expenseChange')}</Label>
            <Input
              id="sim-expense"
              type="number"
              value={expenseChange}
              onChange={(e) => setExpenseChange(e.target.value)}
              step="100"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('simulator.horizon')}</Label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHORT_HORIZONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t('simulator.months', { count: m })}
                  </SelectItem>
                ))}
                <SelectItem value={String(LONG_TERM_SIMULATOR_MONTHS)}>
                  {t('simulator.months20Years')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={`grid gap-3 pt-2 border-t ${
            showFinGoal
              ? 'grid-cols-2 lg:grid-cols-5'
              : 'grid-cols-2 lg:grid-cols-4'
          }`}
        >
          <div className="rounded-lg border p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="text-xs text-muted-foreground">{t('simulator.endingSavings')}</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {format(result.endingSavings)}
            </p>
          </div>
          {showFinGoal && (
            <div className="rounded-lg border p-4 bg-violet-50/50 dark:bg-violet-950/20">
              <p className="text-xs text-muted-foreground">{t('simulator.finGoalAtHorizon')}</p>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  goalGap != null && goalGap <= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-violet-700 dark:text-violet-300'
                }`}
              >
                {goalGap != null && goalGap <= 0
                  ? t('simulator.finGoalReached')
                  : t('simulator.finGoalShort', { amount: format(goalGap ?? 0) })}
              </p>
            </div>
          )}
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{t('simulator.vsBaseline')}</p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                result.savingsDelta >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatDelta(result.savingsDelta)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{t('simulator.avgMonthlyNet')}</p>
            <p className="text-lg font-semibold tabular-nums">{format(result.avgMonthlyNet)}</p>
          </div>
          <div className="rounded-lg border p-4 bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-xs text-muted-foreground">{t('simulator.annualizedGain')}</p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                result.annualizedSavingsGain >= 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatDelta(result.annualizedSavingsGain)}
            </p>
            {result.savingsGrowthPercent !== null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('simulator.savingsGrowth')}: {result.savingsGrowthPercent >= 0 ? '+' : ''}
                {result.savingsGrowthPercent.toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">{t('simulator.projectionChart')}</p>
          <div className={horizon > 24 ? 'h-72' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickFormatter={(value) => value || ''}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    `${symbol}${Math.round(convert(value)).toLocaleString()}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      scenario: t('simulator.scenarioLine'),
                      baseline: t('simulator.baselineLine'),
                    };
                    return [format(value), labels[name] || name];
                  }}
                  labelFormatter={(label, payload) => {
                    const month = payload?.[0]?.payload?.month;
                    if (month == null) return label;
                    return horizon > 24
                      ? t('simulator.yearLabel', { year: Math.ceil(month / 12) })
                      : t('simulator.monthLabel', { count: month });
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => {
                    if (value === 'scenario') return t('simulator.scenarioLine');
                    if (value === 'baseline') return t('simulator.baselineLine');
                    return value;
                  }}
                />
                {showFinGoal && (
                  <ReferenceLine
                    y={finGoalTargetAmount}
                    stroke="hsl(262, 83%, 58%)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{
                      value: t('simulator.finGoalLine', {
                        amount: format(finGoalTargetAmount),
                      }),
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: 'hsl(262, 83%, 58%)',
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="scenario"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">
            {horizon > 24 ? t('simulator.yearlyBreakdown') : t('simulator.monthlyBreakdown')}
          </p>
          <ScrollArea className="h-[220px] rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">{t('simulator.columnMonth')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('simulator.columnScenario')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('simulator.columnBaseline')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('simulator.columnDelta')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.month} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {horizon > 24
                        ? t('simulator.yearLabel', { year: Math.ceil(row.month / 12) })
                        : t('simulator.monthLabel', { count: row.month })}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {format(row.cumulativeSavings)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {format(row.baselineCumulativeSavings)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        row.savingsDelta >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatDelta(row.savingsDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}