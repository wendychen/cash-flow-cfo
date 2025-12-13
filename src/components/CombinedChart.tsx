import { useMemo } from "react";
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
} from "recharts";
import { Expense } from "@/types/expense";
import { Saving } from "@/types/saving";
import { TrendingUp, PiggyBank } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface CombinedChartProps {
  expenses: Expense[];
  savings: Saving[];
}

const CombinedChart = ({ expenses, savings }: CombinedChartProps) => {
  const { format: formatCurrency, convert, symbol } = useCurrency();

  const chartData = useMemo(() => {
    if (expenses.length === 0 && savings.length === 0) {
      return { data: [], avgDailyExpense: 0, avgDailySavingsGrowth: 0, expenseProjection: 0, savingsProjection: 0 };
    }

    // Group expenses by date
    const dailyExpenses: Record<string, number> = {};
    expenses.forEach((exp) => {
      dailyExpenses[exp.date] = (dailyExpenses[exp.date] || 0) + exp.amount;
    });

    // Get savings by date (latest entry per date)
    const savingsByDate: Record<string, number> = {};
    savings.forEach((sav) => {
      savingsByDate[sav.date] = sav.amount;
    });

    // Get all unique dates
    const allDates = new Set([...Object.keys(dailyExpenses), ...Object.keys(savingsByDate)]);
    const sortedDates = Array.from(allDates).sort();

    const today = new Date().toISOString().split("T")[0];

    // Calculate cumulative expenses
    let cumulativeExpense = 0;
    const dataByDate: Record<string, any> = {};

    sortedDates.forEach((date) => {
      cumulativeExpense += dailyExpenses[date] || 0;
      const isFuture = date > today;
      
      dataByDate[date] = {
        date,
        label: format(parseISO(date), "MM/dd"),
        expenseCumulative: isFuture ? null : cumulativeExpense,
        futureExpense: isFuture ? cumulativeExpense : null,
        savings: savingsByDate[date] || null,
      };
    });

    // Fill in savings for dates that don't have explicit entries (carry forward)
    let lastSavings: number | null = null;
    sortedDates.forEach((date) => {
      if (savingsByDate[date] !== undefined) {
        lastSavings = savingsByDate[date];
      }
      if (lastSavings !== null && dataByDate[date].savings === null) {
        dataByDate[date].savings = lastSavings;
      }
    });

    const chartData = sortedDates.map((date) => dataByDate[date]);

    // Calculate averages for projections
    const expenseDates = Object.keys(dailyExpenses).filter(d => d <= today);
    const savingsDates = Object.keys(savingsByDate).sort();

    let avgDailyExpense = 0;
    if (expenseDates.length > 0) {
      const firstExpenseDate = parseISO(expenseDates.sort()[0]);
      const lastExpenseDate = parseISO(expenseDates.sort().reverse()[0]);
      const daysDiff = Math.max(1, Math.ceil((lastExpenseDate.getTime() - firstExpenseDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const totalExpenses = expenses.filter(e => e.date <= today).reduce((sum, exp) => sum + exp.amount, 0);
      avgDailyExpense = totalExpenses / daysDiff;
    }

    let avgDailySavingsGrowth = 0;
    if (savingsDates.length >= 2) {
      const firstSavingsDate = parseISO(savingsDates[0]);
      const lastSavingsDate = parseISO(savingsDates[savingsDates.length - 1]);
      const daysDiff = Math.max(1, Math.ceil((lastSavingsDate.getTime() - firstSavingsDate.getTime()) / (1000 * 60 * 60 * 24)));
      const savingsGrowth = savingsByDate[savingsDates[savingsDates.length - 1]] - savingsByDate[savingsDates[0]];
      avgDailySavingsGrowth = savingsGrowth / daysDiff;
    }

    // Generate projections
    const lastDate = sortedDates.length > 0 ? parseISO(sortedDates[sortedDates.length - 1]) : new Date();
    const lastCumulativeExpense = cumulativeExpense;
    const lastSavingsValue = lastSavings || 0;

    for (let i = 1; i <= 30; i++) {
      const projDate = addDays(lastDate, i);
      const projDateStr = format(projDate, "yyyy-MM-dd");
      chartData.push({
        date: projDateStr,
        label: format(projDate, "MM/dd"),
        expenseCumulative: null,
        futureExpense: null,
        savings: null,
        projectedExpense: Math.round(lastCumulativeExpense + avgDailyExpense * i),
        projectedSavings: Math.round(lastSavingsValue + avgDailySavingsGrowth * i),
      });
    }

    const expenseProjection = Math.round(lastCumulativeExpense + avgDailyExpense * 30);
    const savingsProjection = Math.round(lastSavingsValue + avgDailySavingsGrowth * 30);

    return { data: chartData, avgDailyExpense, avgDailySavingsGrowth, expenseProjection, savingsProjection };
  }, [expenses, savings]);

  if (expenses.length === 0 && savings.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card p-5 text-center text-muted-foreground">
        Add expenses or savings to see the chart
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Cash Flow Trend</h2>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          {chartData.avgDailyExpense > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Spend:</span>
              <span className="font-medium text-foreground">{formatCurrency(chartData.avgDailyExpense)}/day</span>
            </div>
          )}
          {chartData.avgDailySavingsGrowth !== 0 && (
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Save:</span>
              <span className="font-medium text-emerald-600">{chartData.avgDailySavingsGrowth >= 0 ? '+' : ''}{formatCurrency(chartData.avgDailySavingsGrowth)}/day</span>
            </div>
          )}
        </div>
      </div>

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
                  expenseCumulative: "Expenses",
                  futureExpense: "Future Expenses",
                  savings: "Savings",
                  projectedExpense: "Projected Expenses",
                  projectedSavings: "Projected Savings",
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelFormatter={(label) => label}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  expenseCumulative: "Expenses",
                  futureExpense: "Future",
                  savings: "Savings",
                  projectedExpense: "Exp. Projection",
                  projectedSavings: "Sav. Projection",
                };
                return labels[value] || value;
              }}
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
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">30-day expense projection</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(chartData.expenseProjection)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">30-day savings projection</span>
          <span className="text-lg font-bold text-emerald-600">{formatCurrency(chartData.savingsProjection)}</span>
        </div>
      </div>
    </div>
  );
};

export default CombinedChart;
