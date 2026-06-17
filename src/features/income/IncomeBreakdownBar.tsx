import { Banknote, Clock, ArrowDownToLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Income } from '@/types/income';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import { computeIncomeBreakdown } from '@/lib/incomeBreakdown';

interface IncomeBreakdownBarProps {
  incomes: Income[];
}

export default function IncomeBreakdownBar({ incomes }: IncomeBreakdownBarProps) {
  const { format } = useCurrency();
  const { t } = useI18n();
  const breakdown = computeIncomeBreakdown(incomes);

  if (breakdown.total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30 text-sm">
      <span className="text-muted-foreground font-medium">{t('income.breakdown.label')}</span>
      <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
        <Banknote className="h-3 w-3" />
        {t('income.breakdown.cash')}: {format(breakdown.cash)}
        <span className="opacity-70">({breakdown.cashPercent}%)</span>
      </Badge>
      <Badge variant="outline" className="gap-1 text-purple-700 border-purple-300">
        <Clock className="h-3 w-3" />
        {t('income.breakdown.accrued')}: {format(breakdown.accrued)}
        <span className="opacity-70">({breakdown.accruedPercent}%)</span>
      </Badge>
      {breakdown.collected > 0 && (
        <Badge variant="outline" className="gap-1 text-teal-700 border-teal-300">
          <ArrowDownToLine className="h-3 w-3" />
          {t('income.breakdown.collected')}: {format(breakdown.collected)}
        </Badge>
      )}
      <span className="text-xs text-muted-foreground ml-auto">
        {t('income.breakdown.total')}: {format(breakdown.total)}
      </span>
    </div>
  );
}