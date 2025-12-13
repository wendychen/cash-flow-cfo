import { useMemo } from "react";
import { format, parseISO, subDays, addDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Expense } from "@/types/expense";
import { TrendingUp } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

interface ExpenseChartProps {
  expenses: Expense[];
}

const ExpenseChart = ({ expenses }: ExpenseChartProps) => {
  const { format: formatCurrency, convert, symbol } = useCurrency();
  const { chartData, projectedData, avgDaily, projection30Days } = useMemo(() => {
    if (expenses.length === 0) {
      return { chartData: [], projectedData: [], avgDaily: 0, projection30Days: 0 };
    }

    // Group expenses by date
    const dailyTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      dailyTotals[exp.date] = (dailyTotals[exp.date] || 0) + exp.amount;
    });

    const sortedDates = Object.keys(dailyTotals).sort();
    if (sortedDates.length === 0) {
      return { chartData: [], projectedData: [], avgDaily: 0, projection30Days: 0 };
    }

    const today = new Date().toISOString().split("T")[0];

    // Calculate cumulative totals and separate past/future
    let cumulative = 0;
    const chartData = sortedDates.map((date) => {
      cumulative += dailyTotals[date];
      const isFuture = date > today;
      return {
        date,
        daily: dailyTotals[date],
        cumulative: isFuture ? null : cumulative,
        futureCumulative: isFuture ? cumulative : null,
        label: format(parseISO(date), "MM/dd"),
      };
    });

    // Calculate average daily spending
    const firstDate = parseISO(sortedDates[0]);
    const lastDate = parseISO(sortedDates[sortedDates.length - 1]);
    const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgDaily = totalSpent / daysDiff;

    // Generate projection for next 30 days
    const projectedData = [];
    const lastCumulative = cumulative;
    for (let i = 1; i <= 30; i++) {
      const projDate = addDays(lastDate, i);
      projectedData.push({
        date: format(projDate, "yyyy-MM-dd"),
        label: format(projDate, "MM/dd"),
        projected: Math.round(lastCumulative + avgDaily * i),
      });
    }

    const projection30Days = Math.round(lastCumulative + avgDaily * 30);

    return { chartData, projectedData, avgDaily, projection30Days };
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-card p-5 text-center text-muted-foreground">
        Add expenses to see the chart
      </div>
    );
  }

  // Merge actual and projected data for the chart
  const combinedData = [
    ...chartData.map((d) => ({ ...d, projected: null })),
    ...projectedData.map((d) => ({ ...d, daily: null, cumulative: null, futureCumulative: null })),
  ];

  return (
    <div className="bg-card rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Spending Trend</h2>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Avg:</span>
          <span className="font-medium text-foreground">{formatCurrency(avgDaily)}/day</span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "cumulative" ? "Total" : name === "futureCumulative" ? "Future" : name === "projected" ? "Projected" : "Daily",
              ]}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="futureCumulative"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.6}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">30-day projection</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(projection30Days)}</span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
