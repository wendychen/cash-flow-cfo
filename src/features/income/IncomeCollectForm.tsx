import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banknote } from 'lucide-react';
import type { Income } from '@/types/income';
import { useCurrency } from '@/hooks/use-currency';
import { useI18n } from '@/i18n';
import {
  getAccruedCollectionStatus,
  validateCollectionAmount,
} from '@/lib/incomeConversion';

interface IncomeCollectFormProps {
  accrued: Income;
  allIncomes: Income[];
  onCollect: (accruedId: string, collection: { date: string; amount: number; note?: string }) => void;
  onCancel: () => void;
}

export default function IncomeCollectForm({
  accrued,
  allIncomes,
  onCollect,
  onCancel,
}: IncomeCollectFormProps) {
  const { format, convertFromNTD, convertToNTD, currency } = useCurrency();
  const { t } = useI18n();
  const status = getAccruedCollectionStatus(accrued, allIncomes);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(
    convertFromNTD(status.outstanding, currency).toFixed(2)
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDisplay = parseFloat(amount);
    const parsedNtd = convertToNTD(parsedDisplay, currency);
    const check = validateCollectionAmount(accrued, parsedNtd, allIncomes);
    if (!check.valid) {
      setError(t(check.errorKey));
      return;
    }
    onCollect(accrued.id, {
      date,
      amount: parsedNtd,
      note: note.trim() || undefined,
    });
    onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-2"
    >
      <p className="text-xs text-muted-foreground">
        {t('income.collection.outstanding')}: {format(status.outstanding)}
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            {t('income.collection.date')}
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 w-36 text-xs"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            {t('income.collection.amount')}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={convertFromNTD(status.outstanding, currency)}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            className="h-8 w-28 text-xs"
            required
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground block mb-1">
            {t('income.collection.note')}
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('income.collection.notePlaceholder')}
            className="h-8 text-xs"
          />
        </div>
        <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
          <Banknote className="h-3.5 w-3.5 mr-1" />
          {t('income.collection.submit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onCancel}>
          {t('income.collection.cancel')}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}