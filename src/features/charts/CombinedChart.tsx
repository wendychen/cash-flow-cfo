import { useMemo, useState, useCallback } from "react";
import { format, parseISO, addDays } from "date-fns";
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
} from "recharts";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { FinancialTarget, TargetType, TargetPeriod } from "@/types/target";
import type { TimePeriod } from "@/types/timePeriod";
import { TrendingUp, PiggyBank, Wallet, Target, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CombinedChartProps {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  targets?: FinancialTarget[];
  onUpdateTarget?: (type: TargetType, amount: number, period: TargetPeriod, currency: Currency) => void;
  selectedPeriod?: TimePeriod | null;
}

const TARGET_TYPE_KEYS: Record<TargetType, TranslationKey> = {
  income: 'charts.cashFlowTrend.targetTypes.income',
  expense: 'charts.cashFlowTrend.targetTypes.expense',
  savings: 'charts.cashFlowTrend.targetTypes.savings',
};

const PERIOD_KEYS: Record<TargetPeriod, TranslationKey> = {
  weekly: 'goals.repeat.weekly',
  monthly: 'goals.repeat.monthly',
  quarterly: 'goals.repeat.quarterly',
  yearly: 'goals.repeat.yearly',
};

const CombinedChart = ({ expenses, incomes, savings, targets = [], onUpdateTarget, selectedPeriod }: CombinedChartProps) => {
  const { t } = useI18n();
  const { format: formatCurrency, convert, symbol, currency, convertToNTD, convertFromNTD } = useCurrency();
  const [isOpen, setIsOpen] = useState(true);

  const getTargetTypeLabel = (type: TargetType) => t(TARGET_TYPE_KEYS[type]);
  const getPeriodLabel = (period: TargetPeriod) => t(PERIOD_KEYS[period]);

  const seriesLabels = useMemo(
    () => ({
      expenseCumulative: t('charts.cashFlowTrend.series.expenseCumulative'),
      futureExpense: t('charts.cashFlowTrend.series.futureExpense'),
      incomeCumulative: t('charts.cashFlowTrend.series.incomeCumulative'),
      savings: t('charts.cashFlowTrend.series.savings'),
      projectedExpense: t('charts.cashFlowTrend.series.projectedExpense'),
      projectedIncome: t('charts.cashFlowTrend.series.projectedIncome'),
      projectedSavings: t('charts.cashFlowTrend.series.projectedSavings'),
      future: t('charts.cashFlowTrend.series.future'),
      projectedExpenseShort: t('charts.cashFlowTrend.series.expProj'),
      projectedIncomeShort: t('charts.cashFlowTrend.series.incProj'),
      projectedSavingsShort: t('charts.cashFlowTrend.series.savProj'),
    }),
    [t]
  );

  const [editingTarget, setEditingTarget] = useState<{
    type: TargetType;
    period: TargetPeriod;
    amount: string;
  } | null>(null);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newTargetType, setNewTargetType] = useState<TargetType>("income");
  const [newTargetPeriod, setNewTargetPeriod] = useState<TargetPeriod>("monthly");
  const [newTargetAmount, setNewTargetAmount] = useState("");

  const getPeriodFromSelection = useCallback((): TargetPeriod => {
    if (!selectedPeriod) return "monthly";
    const daysDiff = Math.ceil((selectedPeriod.endDate.getTime() - selectedPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) return "weekly";
    if (daysDiff <= 31) return "monthly";
    if (daysDiff <= 92) return "quarterly";
    return "yearly";
  }, [selectedPeriod]);

  const currentPeriod = getPeriodFromSelection();

  const relevantTargets = useMemo(() => {
    return targets.filter(t => t.period === currentPeriod && t.currency === currency);
  }, [targets, currentPeriod, currency]);

  const getTargetValue = (type: TargetType): number | null => {
    const target = relevantTargets.find(t => t.type === type);
    return target ? target.amount : null;
  };

  const handleConfirmTargetUpdate = () => {
    if (editingTarget && onUpdateTarget) {
      const parsed = parseFloat(editingTarget.amount);
      if (isNaN(parsed) || parsed <= 0) return;
      const amountInNTD = convertToNTD(parsed, currency);
      onUpdateTarget(editingTarget.type, amountInNTD, editingTarget.period, currency);
      setEditingTarget(null);
    }
  };

  const handleAddTarget = () => {
    if (onUpdateTarget && newTargetAmount) {
      const parsed = parseFloat(newTargetAmount);
      if (isNaN(parsed) || parsed <= 0) return;
      const amountInNTD = convertToNTD(parsed, currency);
      onUpdateTarget(newTargetType, amountInNTD, newTargetPeriod, currency);
      setShowTargetDialog(false);
      setNewTargetAmount("");
    }
  };

  const isEditTargetValid = editingTarget && !isNaN(parseFloat(editingTarget.amount)) && parseFloat(editingTarget.amount) > 0;
  const isNewTargetValid = newTargetAmount && !isNaN(parseFloat(newTargetAmount)) && parseFloat(newTargetAmount) > 0;

  const openEditDialog = (type: TargetType) => {
    const target = relevantTargets.find(t => t.type === type);
    if (target) {
      setEditingTarget({
        type,
        period: currentPeriod,
        amount: convertFromNTD(target.amount, currency).toFixed(currency === "NTD" ? 0 : 2),
      });
    } else {
      setNewTargetType(type);
      setNewTargetPeriod(currentPeriod);
      setShowTargetDialog(true);
    }
  };

  const chartData = useMemo(() => {
    const safeParseISO = (dateStr: string) => {
      if (!dateStr) return null;
      try {
        const parsed = parseISO(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      } catch {
        return null;
      }
    };

    if (expenses.length === 0 && incomes.length === 0 && savings.length === 0) {
      return { 
        data: [], 
        avgDailyExpense: 0, 
        avgDailyIncome: 0,
        avgDailySavingsGrowth: 0, 
        expenseProjection: 0, 
        incomeProjection: 0,
        savingsProjection: 0,
        netProjection: 0,
      };
    }

    // Group expenses by date
    const dailyExpenses: Record<string, number> = {};
    expenses.forEach((exp) => {
      dailyExpenses[exp.date] = (dailyExpenses[exp.date] || 0) + exp.amount;
    });

    // Group incomes by date
    const dailyIncomes: Record<string, number> = {};
    incomes.forEach((inc) => {
      dailyIncomes[inc.date] = (dailyIncomes[inc.date] || 0) + inc.amount;
    });

    // Get savings by date (latest entry per date)
    const savingsByDate: Record<string, number> = {};
    savings.forEach((sav) => {
      savingsByDate[sav.date] = sav.amount;
    });

    // Get all unique dates
    const allDates = new Set([
      ...Object.keys(dailyExpenses), 
      ...Object.keys(dailyIncomes),
      ...Object.keys(savingsByDate)
    ]);
    const sortedDates = Array.from(allDates).sort();

    const today = new Date().toISOString().split("T")[0];

    // Calculate cumulative values
    let cumulativeExpense = 0;
    let cumulativeIncome = 0;
    const dataByDate: Record<string, any> = {};

    sortedDates.forEach((dateStr) => {
      const parsed = safeParseISO(dateStr);
      if (!parsed) return;

      cumulativeExpense += dailyExpenses[dateStr] || 0;
      cumulativeIncome += dailyIncomes[dateStr] || 0;
      const isFuture = dateStr > today;
      
      dataByDate[dateStr] = {
        date: dateStr,
        label: format(parsed, "MM/dd"),
        expenseCumulative: isFuture ? null : cumulativeExpense,
        futureExpense: isFuture ? cumulativeExpense : null,
        incomeCumulative: isFuture ? null : cumulativeIncome,
        savings: savingsByDate[dateStr] || null,
      };
    });

    // Fill in savings for dates that don't have explicit entries (carry forward)
    let lastSavings: number | null = null;
    sortedDates.forEach((dateStr) => {
      if (savingsByDate[dateStr] !== undefined) {
        lastSavings = savingsByDate[dateStr];
      }
      if (lastSavings !== null && dataByDate[dateStr] && dataByDate[dateStr].savings === null) {
        dataByDate[dateStr].savings = lastSavings;
      }
    });

    const chartData = sortedDates.map((date) => dataByDate[date]);

    // Calculate averages for projections
    const expenseDates = Object.keys(dailyExpenses).filter(d => d <= today);
    const incomeDates = Object.keys(dailyIncomes).filter(d => d <= today);
    const savingsDates = Object.keys(savingsByDate).sort();

    let avgDailyExpense = 0;
    if (expenseDates.length > 0) {
      const sortedExpenseDates = expenseDates.sort();
      const firstExpenseDateParsed = safeParseISO(sortedExpenseDates[0]);
      const lastExpenseDateParsed = safeParseISO(sortedExpenseDates[sortedExpenseDates.length - 1]);
      if (!firstExpenseDateParsed || !lastExpenseDateParsed) {
        avgDailyExpense = 0;
      } else {
        const daysDiff = Math.max(
          1,
          Math.ceil((lastExpenseDateParsed.getTime() - firstExpenseDateParsed.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        const totalExpenses = expenses
          .filter(e => e.date && e.date <= today)
          .reduce((sum, exp) => sum + exp.amount, 0);
        avgDailyExpense = totalExpenses / daysDiff;
      }
    }

    let avgDailyIncome = 0;
    if (incomeDates.length > 0) {
      const sortedIncomeDates = incomeDates.sort();
      const firstIncomeDateParsed = safeParseISO(sortedIncomeDates[0]);
      const lastIncomeDateParsed = safeParseISO(sortedIncomeDates[sortedIncomeDates.length - 1]);
      if (!firstIncomeDateParsed || !lastIncomeDateParsed) {
        avgDailyIncome = 0;
      } else {
        const daysDiff = Math.max(
          1,
          Math.ceil((lastIncomeDateParsed.getTime() - firstIncomeDateParsed.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        const totalIncomes = incomes
          .filter(i => i.date && i.date <= today)
          .reduce((sum, inc) => sum + inc.amount, 0);
        avgDailyIncome = totalIncomes / daysDiff;
      }
    }

    let avgDailySavingsGrowth = 0;
    if (savingsDates.length >= 2) {
      const firstSavingsDateParsed = safeParseISO(savingsDates[0]);
      const lastSavingsDateParsed = safeParseISO(savingsDates[savingsDates.length - 1]);
      if (firstSavingsDateParsed && lastSavingsDateParsed) {
        const daysDiff = Math.max(
          1,
          Math.ceil((lastSavingsDateParsed.getTime() - firstSavingsDateParsed.getTime()) / (1000 * 60 * 60 * 24))
        );
        const savingsGrowth =
          savingsByDate[savingsDates[savingsDates.length - 1]] - savingsByDate[savingsDates[0]];
        avgDailySavingsGrowth = savingsGrowth / daysDiff;
      }
    }

    // Generate projections
    const lastParsedDate =
      sortedDates.length > 0 ? safeParseISO(sortedDates[sortedDates.length - 1]) : null;
    const lastDate = lastParsedDate || new Date();
    const lastCumulativeExpense = cumulativeExpense;
    const lastCumulativeIncome = cumulativeIncome;
    const lastSavingsValue = lastSavings || 0;

    for (let i = 1; i <= 30; i++) {
      const projDate = addDays(lastDate, i);
      const projDateStr = format(projDate, "yyyy-MM-dd");
      chartData.push({
        date: projDateStr,
        label: format(projDate, "MM/dd"),
        expenseCumulative: null,
        futureExpense: null,
        incomeCumulative: null,
        savings: null,
        projectedExpense: Math.round(lastCumulativeExpense + avgDailyExpense * i),
        projectedIncome: Math.round(lastCumulativeIncome + avgDailyIncome * i),
        projectedSavings: Math.round(lastSavingsValue + avgDailySavingsGrowth * i),
      });
    }

    const expenseProjection = Math.round(lastCumulativeExpense + avgDailyExpense * 30);
    const incomeProjection = Math.round(lastCumulativeIncome + avgDailyIncome * 30);
    const savingsProjection = Math.round(lastSavingsValue + avgDailySavingsGrowth * 30);
    const netProjection = incomeProjection - expenseProjection;

    return { 
      data: chartData, 
      avgDailyExpense, 
      avgDailyIncome,
      avgDailySavingsGrowth, 
      expenseProjection, 
      incomeProjection,
      savingsProjection,
      netProjection,
    };
  }, [expenses, incomes, savings]);

  if (expenses.length === 0 && incomes.length === 0 && savings.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card p-5 text-center text-muted-foreground">
        {t('charts.cashFlowTrend.empty')}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card rounded-xl shadow-card">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 p-5 text-left hover:bg-muted/30 transition-colors rounded-xl"
        >
          <h2 className="text-lg font-semibold text-foreground">{t('charts.cashFlowTrend.title')}</h2>
          <div className="flex items-center gap-4 text-sm flex-wrap justify-end">
            {isOpen && chartData.avgDailyIncome > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-500" />
                <span className="text-muted-foreground">{t('charts.cashFlowTrend.earn')}</span>
                <span className="font-medium text-violet-600">
                  {t('charts.cashFlowTrend.perDay', { amount: formatCurrency(chartData.avgDailyIncome) })}
                </span>
              </div>
            )}
            {isOpen && chartData.avgDailyExpense > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{t('charts.cashFlowTrend.spend')}</span>
                <span className="font-medium text-foreground">
                  {t('charts.cashFlowTrend.perDay', { amount: formatCurrency(chartData.avgDailyExpense) })}
                </span>
              </div>
            )}
            {isOpen && chartData.avgDailySavingsGrowth !== 0 && (
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">{t('charts.cashFlowTrend.save')}</span>
                <span className="font-medium text-emerald-600">
                  {t('charts.cashFlowTrend.perDay', {
                    amount: `${chartData.avgDailySavingsGrowth >= 0 ? '+' : ''}${formatCurrency(chartData.avgDailySavingsGrowth)}`,
                  })}
                </span>
              </div>
            )}
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-5 pb-5">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${symbol}${Math.round(convert(value)).toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  expenseCumulative: seriesLabels.expenseCumulative,
                  futureExpense: seriesLabels.futureExpense,
                  incomeCumulative: seriesLabels.incomeCumulative,
                  savings: seriesLabels.savings,
                  projectedExpense: seriesLabels.projectedExpense,
                  projectedIncome: seriesLabels.projectedIncome,
                  projectedSavings: seriesLabels.projectedSavings,
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelFormatter={(label) => label}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  expenseCumulative: seriesLabels.expenseCumulative,
                  futureExpense: seriesLabels.future,
                  incomeCumulative: seriesLabels.incomeCumulative,
                  savings: seriesLabels.savings,
                  projectedExpense: seriesLabels.projectedExpenseShort,
                  projectedIncome: seriesLabels.projectedIncomeShort,
                  projectedSavings: seriesLabels.projectedSavingsShort,
                };
                return labels[value] || value;
              }}
            />
            {/* Income line */}
            <Line
              type="monotone"
              dataKey="incomeCumulative"
              stroke="hsl(263, 70%, 50%)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {/* Expenses line */}
            <Line
              type="monotone"
              dataKey="expenseCumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {/* Future expenses line */}
            <Line
              type="monotone"
              dataKey="futureExpense"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {/* Savings line */}
            <Line
              type="monotone"
              dataKey="savings"
              stroke="hsl(152, 60%, 45%)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {/* Projected income */}
            <Line
              type="monotone"
              dataKey="projectedIncome"
              stroke="hsl(263, 70%, 50%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.6}
              connectNulls={false}
            />
            {/* Projected expenses */}
            <Line
              type="monotone"
              dataKey="projectedExpense"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.6}
              connectNulls={false}
            />
            {/* Projected savings */}
            <Line
              type="monotone"
              dataKey="projectedSavings"
              stroke="hsl(152, 60%, 45%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.6}
              connectNulls={false}
            />
            {/* Target reference lines */}
            {getTargetValue("income") !== null && (
              <ReferenceLine
                y={getTargetValue("income")!}
                stroke="hsl(263, 70%, 50%)"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: t('charts.cashFlowTrend.incomeTargetLine', {
                    amount: formatCurrency(getTargetValue("income")!),
                  }),
                  position: "insideTopRight",
                  fill: "hsl(263, 70%, 50%)",
                  fontSize: 10,
                }}
              />
            )}
            {getTargetValue("expense") !== null && (
              <ReferenceLine
                y={getTargetValue("expense")!}
                stroke="hsl(0, 70%, 50%)"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: t('charts.cashFlowTrend.expenseLimitLine', {
                    amount: formatCurrency(getTargetValue("expense")!),
                  }),
                  position: "insideTopRight",
                  fill: "hsl(0, 70%, 50%)",
                  fontSize: 10,
                }}
              />
            )}
            {getTargetValue("savings") !== null && (
              <ReferenceLine
                y={getTargetValue("savings")!}
                stroke="hsl(152, 60%, 45%)"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: t('charts.cashFlowTrend.savingsTargetLine', {
                    amount: formatCurrency(getTargetValue("savings")!),
                  }),
                  position: "insideTopRight",
                  fill: "hsl(152, 60%, 45%)",
                  fontSize: 10,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('charts.cashFlowTrend.projection30Income')}</span>
          <span className="text-lg font-bold text-violet-600">{formatCurrency(chartData.incomeProjection)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('charts.cashFlowTrend.projection30Expenses')}</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(chartData.expenseProjection)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('charts.cashFlowTrend.projection30Savings')}</span>
          <span className="text-lg font-bold text-emerald-600">{formatCurrency(chartData.savingsProjection)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('charts.cashFlowTrend.netCashFlow')}</span>
          <span className={`text-lg font-bold ${chartData.netProjection >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {chartData.netProjection >= 0 ? '+' : ''}{formatCurrency(chartData.netProjection)}
          </span>
        </div>
      </div>

      {onUpdateTarget && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('charts.cashFlowTrend.targets', {
                period: getPeriodLabel(currentPeriod),
                currency,
              })}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTargetDialog(true)}
              data-testid="button-add-target"
            >
              {t('charts.cashFlowTrend.addTarget')}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => openEditDialog("income")}
              className="p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors text-left"
              data-testid="button-edit-income-target"
            >
              <div className="text-xs text-violet-600 dark:text-violet-400">{t('charts.cashFlowTrend.incomeTarget')}</div>
              <div className="text-lg font-bold text-violet-700 dark:text-violet-300">
                {getTargetValue("income") !== null ? formatCurrency(getTargetValue("income")!) : t('charts.cashFlowTrend.notSet')}
              </div>
            </button>
            <button
              onClick={() => openEditDialog("expense")}
              className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-left"
              data-testid="button-edit-expense-target"
            >
              <div className="text-xs text-red-600 dark:text-red-400">{t('charts.cashFlowTrend.expenseLimit')}</div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                {getTargetValue("expense") !== null ? formatCurrency(getTargetValue("expense")!) : t('charts.cashFlowTrend.notSet')}
              </div>
            </button>
            <button
              onClick={() => openEditDialog("savings")}
              className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors text-left"
              data-testid="button-edit-savings-target"
            >
              <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('charts.cashFlowTrend.savingsTarget')}</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {getTargetValue("savings") !== null ? formatCurrency(getTargetValue("savings")!) : t('charts.cashFlowTrend.notSet')}
              </div>
            </button>
          </div>
        </div>
      )}
      </CollapsibleContent>

      <Dialog open={!!editingTarget} onOpenChange={() => setEditingTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTarget &&
                t('charts.cashFlowTrend.updateTitle', {
                  type: getTargetTypeLabel(editingTarget.type),
                })}
            </DialogTitle>
            <DialogDescription>
              {editingTarget &&
                t('charts.cashFlowTrend.updateDescription', {
                  period: getPeriodLabel(currentPeriod),
                  type: getTargetTypeLabel(editingTarget.type),
                  currency,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">{t('charts.cashFlowTrend.amount', { currency })}</label>
            <Input
              type="number"
              value={editingTarget?.amount || ""}
              onChange={(e) => setEditingTarget(prev => prev ? {...prev, amount: e.target.value} : null)}
              placeholder={t('charts.cashFlowTrend.amountPlaceholder')}
              className="mt-1"
              data-testid="input-edit-target-amount"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTarget(null)}>{t('charts.cashFlowTrend.cancel')}</Button>
            <Button onClick={handleConfirmTargetUpdate} disabled={!isEditTargetValid} data-testid="button-confirm-target">
              {t('charts.cashFlowTrend.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('charts.cashFlowTrend.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('charts.cashFlowTrend.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t('charts.cashFlowTrend.targetType')}</label>
              <Select value={newTargetType} onValueChange={(val) => setNewTargetType(val as TargetType)}>
                <SelectTrigger className="mt-1" data-testid="select-target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t('charts.cashFlowTrend.incomeTarget')}</SelectItem>
                  <SelectItem value="expense">{t('charts.cashFlowTrend.expenseLimit')}</SelectItem>
                  <SelectItem value="savings">{t('charts.cashFlowTrend.savingsTarget')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('charts.cashFlowTrend.period')}</label>
              <Select value={newTargetPeriod} onValueChange={(val) => setNewTargetPeriod(val as TargetPeriod)}>
                <SelectTrigger className="mt-1" data-testid="select-target-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('goals.repeat.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('goals.repeat.monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('goals.repeat.quarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('goals.repeat.yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('charts.cashFlowTrend.amount', { currency })}</label>
              <Input
                type="number"
                value={newTargetAmount}
                onChange={(e) => setNewTargetAmount(e.target.value)}
                placeholder={t('charts.cashFlowTrend.amountPlaceholder')}
                className="mt-1"
                data-testid="input-new-target-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTargetDialog(false)}>{t('charts.cashFlowTrend.cancel')}</Button>
            <Button onClick={handleAddTarget} disabled={!isNewTargetValid} data-testid="button-save-target">
              {t('charts.cashFlowTrend.saveTarget')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
};

export default CombinedChart;
