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
import { FixedExpense } from "@/types/fixedExpense";
import { useCurrency } from "@/hooks/use-currency";
import { useI18n } from "@/i18n";
import { buildMonthlySummaryData } from "@/lib/monthlySummary";

interface MonthlySummaryProps {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  fixedExpenses: FixedExpense[];
}

const MonthlySummary = ({ expenses, incomes, savings, fixedExpenses }: MonthlySummaryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showPredictions, setShowPredictions] = useState(false);
  const { format } = useCurrency();
  const { t, locale } = useI18n();

  const monthlyData = useMemo(
    () =>
      buildMonthlySummaryData({
        expenses,
        incomes,
        savings,
        fixedExpenses,
        showPredictions,
        locale,
      }),
    [expenses, incomes, savings, fixedExpenses, showPredictions, locale]
  );

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
                <h3 className="font-semibold text-foreground">{t('monthlySummary.title')}</h3>
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
                    {t('monthlySummary.predictions')}
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
            <ScrollArea className="h-[500px]">
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
                        <span className="text-xs text-purple-500 font-normal">
                          ({t('monthlySummary.prediction')})
                        </span>
                      )}
                      {data.isCurrentMonth && (
                        <span className="text-xs text-amber-600 font-normal">
                          ({t('monthlySummary.currentMonth')})
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('monthlySummary.income')}</p>
                          <p className={`font-semibold text-violet-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.isPrediction ? "~" : "+"}
                            {format(data.totalIncome)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Wallet className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('monthlySummary.expenses')}</p>
                          <p className={`font-semibold text-blue-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.isPrediction ? "~" : "-"}
                            {format(data.totalExpenses)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('monthlySummary.fixed')}</p>
                          <p className="font-semibold text-orange-600 text-sm truncate">
                            -{format(data.fixedExpensesMonthly)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <PiggyBank className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{t('monthlySummary.savings')}</p>
                          <p className={`font-semibold text-emerald-600 text-sm truncate ${data.isPrediction ? "opacity-75" : ""}`}>
                            {data.savingsBalance !== null
                              ? `${data.isPrediction ? "~" : ""}${format(data.savingsBalance)}`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        {data.netFlow >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">{t('monthlySummary.netFlow')}</span>
                      </div>
                      <p
                        className={`font-bold ${
                          data.netFlow >= 0 ? "text-emerald-600" : "text-red-500"
                        } ${data.isPrediction ? "opacity-75" : ""}`}
                      >
                        {data.isPrediction ? "~" : data.netFlow >= 0 ? "+" : ""}
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