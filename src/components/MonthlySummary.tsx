import { useState, useMemo } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Wallet, PiggyBank, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

const MonthlySummary = ({ expenses, incomes, savings, fixedExpenses }: MonthlySummaryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { format } = useCurrency();

  // Calculate fixed expenses monthly equivalent (same for all months)
  const fixedExpensesMonthly = useMemo(() => {
    return fixedExpenses
      .filter((exp) => exp.isActive)
      .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount, exp.frequency), 0);
  }, [fixedExpenses]);

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

    // Sort by month descending (most recent first)
    return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [expenses, incomes, savings, fixedExpensesMonthly]);

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
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {monthlyData.map((data) => (
                  <div
                    key={data.month}
                    className="border border-border rounded-lg p-4 bg-muted/30"
                  >
                    <h4 className="font-medium text-foreground mb-3 text-sm border-b border-border pb-2">
                      {data.displayMonth}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      {/* Income */}
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Income</p>
                          <p className="font-semibold text-violet-600 text-sm truncate">
                            +{format(data.totalIncome)}
                          </p>
                        </div>
                      </div>

                      {/* One-time Expenses */}
                      <div className="flex items-start gap-2">
                        <Wallet className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="font-semibold text-blue-600 text-sm truncate">
                            -{format(data.totalExpenses)}
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
                          <p className="font-semibold text-emerald-600 text-sm truncate">
                            {data.savingsBalance !== null ? format(data.savingsBalance) : "—"}
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
                        }`}
                      >
                        {data.netFlow >= 0 ? "+" : ""}
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
