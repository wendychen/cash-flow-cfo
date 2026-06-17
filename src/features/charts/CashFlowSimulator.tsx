import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import { runCashFlowSimulation } from '@/lib/cashFlowSimulation';
import { Sparkles } from 'lucide-react';

interface CashFlowSimulatorProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
}

const HORIZONS = [3, 6, 12, 24] as const;

export default function CashFlowSimulator({
  monthlyIncome,
  monthlyExpenses,
  currentSavings,
}: CashFlowSimulatorProps) {
  const { format } = useCurrency();
  const { t } = useI18n();
  const [incomeChange, setIncomeChange] = useState('0');
  const [expenseChange, setExpenseChange] = useState('0');
  const [months, setMonths] = useState<string>('12');

  const result = useMemo(() => {
    const incomeDelta = parseFloat(incomeChange) || 0;
    const expenseDelta = parseFloat(expenseChange) || 0;
    const horizon = parseInt(months, 10) || 12;

    return runCashFlowSimulation({
      monthlyIncome,
      monthlyExpenses,
      currentSavings,
      incomeChange: incomeDelta,
      expenseChange: expenseDelta,
      months: horizon,
    });
  }, [monthlyIncome, monthlyExpenses, currentSavings, incomeChange, expenseChange, months]);

  if (monthlyIncome === 0 && monthlyExpenses === 0) {
    return null;
  }

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
                {HORIZONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t('simulator.months', { count: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
          <div className="rounded-lg border p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="text-xs text-muted-foreground">{t('simulator.endingSavings')}</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {format(result.endingSavings)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{t('simulator.vsBaseline')}</p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                result.savingsDelta >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {result.savingsDelta >= 0 ? '+' : ''}
              {format(result.savingsDelta)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}