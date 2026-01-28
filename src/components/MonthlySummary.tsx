import { useState, useMemo } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Wallet, PiggyBank, RefreshCw, Star, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { FixedExpense, getMonthlyEquivalent } from "@/types/fixedExpense";
import { useCurrency } from "@/hooks/use-currency";

interface MonthlySummaryProps {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
}

interface MonthData {
  month: string; // YYYY-MM format
  displayMonth: string; // "January 2026" format
  totalIncome: number;
  totalExpenses: number;
  fixedExpensesMonthly: number;
  savingsBalance: number | null;
  netFlow: number;
  isPrediction: boolean;
  isCurrentMonth: boolean;
}

const MonthlySummary = ({ expenses, incomes, savings, fixedExpenses }: MonthlySummaryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showPredictions, setShowPredictions] = useState(false);
  const { format } = useCurrency();

  // Get current month in YYYY-MM format
  const currentMonth = useMemo(() => {
    return new Date().toISOString().slice(0, 7);
  }, []);

  // Calculate fixed expenses monthly equivalent (same for all months)
  const fixedExpensesMonthly = useMemo(() => {
    return fixedExpenses
      .filter((exp) => exp.isActive)
      .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount, exp.frequency), 0);
  }, [fixedExpenses]);

  // Calculate historical averages for predictions
  const historicalAverages = useMemo(() => {
    const pastMonthsIncome = new Map<string, number>();
    const pastMonthsExpenses = new Map<string, number>();
    const savingsBalances: { month: string; balance: number }[] = [];

    // Aggregate income by month (only past months)
    incomes.forEach((inc) => {
      const month = inc.date.substring(0, 7);
      if (month < currentMonth) {
        pastMonthsIncome.set(month, (pastMonthsIncome.get(month) || 0) + inc.amount);
      }
    });

    // Aggregate expenses by month (only past months)
    expenses.forEach((exp) => {
      const month = exp.date.substring(0, 7);
      if (month < currentMonth) {
        pastMonthsExpenses.set(month, (pastMonthsExpenses.get(month) || 0) + exp.amount);
      }
    });

    // Get savings balances per month (for calculating growth)
    const savingsByMonth = new Map<string, Saving[]>();
    savings.forEach((sav) => {
      const month = sav.date.substring(0, 7);
      if (!savingsByMonth.has(month)) {
        savingsByMonth.set(month, []);
      }
      savingsByMonth.get(month)!.push(sav);
    });

    savingsByMonth.forEach((monthSavings, month) => {
      const sorted = [...monthSavings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      savingsBalances.push({ month, balance: sorted[0].amount });
    });

    // Sort savings by month
    savingsBalances.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate averages
    const incomeValues = Array.from(pastMonthsIncome.values());
    const expenseValues = Array.from(pastMonthsExpenses.values());

    const avgIncome = incomeValues.length > 0
      ? incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length
      : 0;

    const avgExpenses = expenseValues.length > 0
      ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length
      : 0;

    // Calculate average monthly savings growth
    let avgSavingsGrowth = 0;
    if (savingsBalances.length >= 2) {
      const growths: number[] = [];
      for (let i = 1; i < savingsBalances.length; i++) {
        growths.push(savingsBalances[i].balance - savingsBalances[i - 1].balance);
      }
      avgSavingsGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
    }

    // Get the latest savings balance
    const latestSavings = savingsBalances.length > 0
      ? savingsBalances[savingsBalances.length - 1].balance
      : null;

    return { avgIncome, avgExpenses, avgSavingsGrowth, latestSavings };
  }, [incomes, expenses, savings, currentMonth]);

  // Generate prediction months
  const predictionMonths = useMemo((): MonthData[] => {
    if (!showPredictions) return [];

    const predictions: MonthData[] = [];
    const { avgIncome, avgExpenses, avgSavingsGrowth, latestSavings } = historicalAverages;

    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const month = date.toISOString().slice(0, 7);
      const displayMonth = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      const predictedSavings = latestSavings !== null
        ? latestSavings + (avgSavingsGrowth * i)
        : null;

      predictions.push({
        month,
        displayMonth,
        totalIncome: avgIncome,
        totalExpenses: avgExpenses,
        fixedExpensesMonthly,
        savingsBalance: predictedSavings,
        netFlow: avgIncome - avgExpenses - fixedExpensesMonthly,
        isPrediction: true,
        isCurrentMonth: false,
      });
    }

    return predictions;
  }, [showPredictions, historicalAverages, fixedExpensesMonthly]);

  // Aggregate data by month
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, MonthData>();

    // Get all unique months from all data sources
    const allMonths = new Set<string>();

    expenses.forEach((exp) => {
      const month = exp.date.substring(0, 7);
      allMonths.add(month);
    });

    incomes.forEach((inc) => {
      const month = inc.date.substring(0, 7);
      allMonths.add(month);
    });

    savings.forEach((sav) => {
      const month = sav.date.substring(0, 7);
      allMonths.add(month);
    });

    // Initialize month data
    allMonths.forEach((month) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      const displayMonth = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      monthMap.set(month, {
        month,
        displayMonth,
        totalIncome: 0,
        totalExpenses: 0,
        fixedExpensesMonthly,
        savingsBalance: null,
        netFlow: 0,
        isPrediction: false,
        isCurrentMonth: month === currentMonth,
      });
    });

    // Aggregate incomes
    incomes.forEach((inc) => {
      const month = inc.date.substring(0, 7);
      const data = monthMap.get(month);
      if (data) {
        data.totalIncome += inc.amount;
      }
    });

    // Aggregate expenses
    expenses.forEach((exp) => {
      const month = exp.date.substring(0, 7);
      const data = monthMap.get(month);
      if (data) {
        data.totalExpenses += exp.amount;
      }
    });

    // Get latest savings balance per month
    const savingsByMonth = new Map<string, Saving[]>();
    savings.forEach((sav) => {
      const month = sav.date.substring(0, 7);
      if (!savingsByMonth.has(month)) {
        savingsByMonth.set(month, []);
      }
      savingsByMonth.get(month)!.push(sav);
    });

    savingsByMonth.forEach((monthSavings, month) => {
      const data = monthMap.get(month);
      if (data) {
        // Sort by date descending and take the latest
        const sorted = [...monthSavings].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        data.savingsBalance = sorted[0].amount;
      }
    });

    // Calculate net flow
    monthMap.forEach((data) => {
      data.netFlow = data.totalIncome - data.totalExpenses - data.fixedExpensesMonthly;
    });

    // Get actual months sorted
    const actualMonths = Array.from(monthMap.values());

    // Custom sort: current month first, then past months descending
    actualMonths.sort((a, b) => {
      // Current month always comes first among actual months
      if (a.isCurrentMonth && !b.isCurrentMonth) return -1;
      if (!a.isCurrentMonth && b.isCurrentMonth) return 1;
      // Otherwise sort by month descending
      return b.month.localeCompare(a.month);
    });

    // Combine predictions (furthest future first) + actual months
    const sortedPredictions = [...predictionMonths].sort((a, b) => b.month.localeCompare(a.month));
    
    return [...sortedPredictions, ...actualMonths];
  }, [expenses, incomes, savings, fixedExpensesMonthly, currentMonth, predictionMonths]);

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <h3 className="font-semibold text-foreground">Monthly Summary</h3>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    id="predictions-toggle"
                    checked={showPredictions}
                    onCheckedChange={setShowPredictions}
                  />
                  <Label htmlFor="predictions-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    Predictions
                  </Label>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {monthlyData.map((data) => (
                  <div
                    key={data.month}
                    className={`border rounded-lg p-4 ${
                      data.isPrediction
                        ? "border-dashed border-purple-400/50 bg-purple-50/30 dark:bg-purple-950/20"
                        : data.isCurrentMonth
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <h4 className="font-medium text-foreground mb-3 text-sm border-b border-border pb-2 flex items-center gap-2">
                      {data.isPrediction && (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      )}
                      {data.isCurrentMonth && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                      <span>{data.displayMonth}</span>
                      {data.isPrediction && (
                        <span className="text-xs text-purple-500 font-normal">(Prediction)</span>
                      )}
                      {data.isCurrentMonth && (
                        <span className="text-xs text-amber-600 font-normal">(Current Month)</span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      {/* Income */}
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Income</p>
                          <p className={`font-semibold text-violet-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.isPrediction ? "~" : "+"}
                            {format(data.totalIncome)}
                          </p>
                        </div>
                      </div>

                      {/* One-time Expenses */}
                      <div className="flex items-start gap-2">
                        <Wallet className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className={`font-semibold text-blue-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.isPrediction ? "~" : "-"}
                            {format(data.totalExpenses)}
                          </p>
                        </div>
                      </div>

                      {/* Fixed Expenses */}
                      <div className="flex items-start gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Fixed</p>
                          <p className="font-semibold text-orange-600 text-sm truncate">
                            -{format(data.fixedExpensesMonthly)}
                          </p>
                        </div>
                      </div>

                      {/* Savings */}
                      <div className="flex items-start gap-2">
                        <PiggyBank className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Savings</p>
                          <p className={`font-semibold text-emerald-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.savingsBalance !== null 
                              ? `${data.isPrediction ? "~" : ""}${format(data.savingsBalance)}`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Net Flow */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        {data.netFlow >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">Net Flow</span>
                      </div>
                      <p
                        className={`font-bold ${
                          data.netFlow >= 0 ? "text-emerald-600" : "text-red-500"
                        } ${data.isPrediction ? "opacity-75" : ""}`}
                      >
                        {data.isPrediction ? "~" : data.netFlow >= 0 ? "+" : ""}
                        {data.netFlow >= 0 && !data.isPrediction ? "" : ""}
                        {format(data.netFlow)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default MonthlySummary;
