import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import { Income, IncomeType } from "@/types/income";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { buildStoredAmountFields, DEFAULT_DISPLAY_CURRENCY } from "@/lib/currencyEntry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";

interface IncomeFormProps {
  onAddIncome: (income: Omit<Income, "id">) => void;
}

const IncomeForm = ({ onAddIncome }: IncomeFormProps) => {
  const { t } = useI18n();
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<Currency>(DEFAULT_DISPLAY_CURRENCY);
  const [incomeType, setIncomeType] = useState<IncomeType>("cash");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !source.trim()) return;

    const stored = buildStoredAmountFields(
      parseFloat(amount),
      inputCurrency,
      convertToNTD
    );

    onAddIncome({
      date,
      source: source.trim(),
      ...stored,
      incomeType,
      note: note.trim() || undefined,
    });

    setSource("");
    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.date')}</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.type')}</label>
          <Select value={incomeType} onValueChange={(val) => setIncomeType(val as IncomeType)}>
            <SelectTrigger className="bg-card" data-testid="select-income-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t('income.type.cash')}</SelectItem>
              <SelectItem value="accrued">{t('income.type.accrued')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-[2] min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.source')}</label>
          <Input
            type="text"
            placeholder={t('forms.sourcePlaceholder')}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-card"
            required
          />
        </div>
        <div className="flex-[1.5] min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.amount')}</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('forms.amountPlaceholder')}
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-card flex-1"
              required
            />
            <Select value={inputCurrency} onValueChange={(val) => setInputCurrency(val as Currency)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NTD">NTD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.noteOptional')}</label>
          <Input
            type="text"
            placeholder={t('forms.incomeNotePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-card"
          />
        </div>
        <Button type="submit" className="shrink-0 bg-violet-600 hover:bg-violet-700">
          <Wallet className="w-4 h-4 mr-1.5" />
          {t('income.form.addIncome')}
        </Button>
      </div>
    </form>
  );
};

export default IncomeForm;
