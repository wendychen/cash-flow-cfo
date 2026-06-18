import { useState } from "react";
import { Plus, Home, Zap, Flame, Phone, Car, Heart, CreditCard, Landmark, Calendar, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FixedExpense, Frequency } from "@/types/fixedExpense";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { FixedExpenseCategory, FIXED_EXPENSE_CATEGORIES, FIXED_EXPENSE_CATEGORY_GROUPS } from "@/types/expenseCategory";
import { FrequencySelectField } from "@/features/shared";
import { useI18n } from "@/i18n";
import { getFixedExpenseCategoryLabel, getFixedExpenseGroupLabel } from "@/lib/categoryLabels";

interface FixedExpenseFormProps {
  onAddFixedExpense: (expense: Omit<FixedExpense, "id" | "createdAt">) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Zap,
  Flame,
  Phone,
  Car,
  Heart,
  CreditCard,
  Landmark,
  Calendar,
  FileText,
};

const FixedExpenseForm = ({ onAddFixedExpense }: FixedExpenseFormProps) => {
  const { t } = useI18n();
  const { convertToNTD } = useCurrency();
  const [category, setCategory] = useState<FixedExpenseCategory>("housing");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [inputCurrency, setInputCurrency] = useState<Currency>("NTD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const amountInNTD = convertToNTD(parsedAmount, inputCurrency);

    onAddFixedExpense({
      description: description.trim(),
      amount: amountInNTD,
      frequency,
      isActive: true,
      category,
    });

    setCategory("housing");
    setDescription("");
    setAmount("");
    setFrequency("monthly");
  };

  const currentMeta = FIXED_EXPENSE_CATEGORIES[category];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap xl:flex-nowrap"
    >
      <div className="w-full min-w-[10rem] md:w-auto md:flex-none md:basis-[11rem]">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.category')}</label>
        <Select value={category} onValueChange={(val) => setCategory(val as FixedExpenseCategory)}>
          <SelectTrigger className="bg-card w-full">
            <div className="flex items-center gap-2 min-w-0">
              {currentMeta && (() => {
                const Icon = iconMap[currentMeta.icon as keyof typeof iconMap] ?? Home;
                return <Icon className="h-4 w-4 shrink-0" />;
              })()}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {FIXED_EXPENSE_CATEGORY_GROUPS.map((group) => (
              <SelectGroup key={group.parentKey ?? group.categories[0]?.key}>
                {group.parentKey && (
                  <SelectLabel className="pl-2">
                    {getFixedExpenseGroupLabel(group.parentKey, t)}
                  </SelectLabel>
                )}
                {group.categories.map(({ key, meta }) => {
                  const Icon = iconMap[meta.icon] ?? Home;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{getFixedExpenseCategoryLabel(key as FixedExpenseCategory, t)}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full min-w-0 md:flex-1 xl:flex-[2]">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.description')}</label>
        <Input
          placeholder={t('forms.fixedDescriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="w-full min-w-[10rem] md:w-auto md:flex-none md:basis-[11rem] xl:flex-1 xl:max-w-[14rem]">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('forms.amount')}</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={t('forms.amountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card flex-1"
            step="0.01"
            min="0"
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
      <div className="w-full min-w-[9rem] md:w-auto md:flex-none md:basis-[10rem]">
        <FrequencySelectField
          value={frequency}
          onValueChange={setFrequency}
          triggerClassName="bg-card w-full"
        />
      </div>
      <Button type="submit" className="shrink-0">
        <Plus className="h-4 w-4 mr-1.5" />
        {t('forms.add')}
      </Button>
    </form>
  );
};

export default FixedExpenseForm;