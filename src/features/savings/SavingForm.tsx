import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PiggyBank, Target } from "lucide-react";
import { Saving, SavingType } from "@/types/saving";
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

interface SavingFormProps {
  onAddSaving: (saving: Omit<Saving, "id">) => void;
}

const SavingForm = ({ onAddSaving }: SavingFormProps) => {
  const { t } = useI18n();
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<Currency>(DEFAULT_DISPLAY_CURRENCY);
  const [note, setNote] = useState("");
  const [savingType, setSavingType] = useState<SavingType>("balance");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    const stored = buildStoredAmountFields(
      parseFloat(amount),
      inputCurrency,
      convertToNTD
    );

    onAddSaving({
      date,
      ...stored,
      note: note.trim() || undefined,
      savingType,
    });

    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="w-28 shrink-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.type')}</label>
        <Select value={savingType} onValueChange={(val) => setSavingType(val as SavingType)}>
          <SelectTrigger className="bg-card" data-testid="select-saving-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balance">{t('savings.type.balance')}</SelectItem>
            <SelectItem value="goal">{t('savings.type.goal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.date')}</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-[2] min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.noteOptional')}</label>
        <Input
          type="text"
          placeholder={t('forms.savingNotePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-1 min-w-0">
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
      <Button type="submit" className={`shrink-0 ${savingType === "goal" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
        {savingType === "goal" ? <Target className="w-4 h-4 mr-1.5" /> : <PiggyBank className="w-4 h-4 mr-1.5" />}
        {t('savings.form.add')}
      </Button>
    </form>
  );
};

export default SavingForm;
