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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <Select value={category} onValueChange={(val) => setCategory(val as FixedExpenseCategory)}>
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center gap-2">
            {currentMeta && (() => {
              const Icon = iconMap[currentMeta.icon as keyof typeof iconMap] ?? Home;
              return <Icon className="h-4 w-4" />;
            })()}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {FIXED_EXPENSE_CATEGORY_GROUPS.map((group) => (
            <SelectGroup key={group.parentKey ?? group.categories[0]?.key}>
              {group.parentLabel && <SelectLabel className="pl-2">{group.parentLabel}</SelectLabel>}
              {group.categories.map(({ key, meta }) => {
                const Icon = iconMap[meta.icon] ?? Home;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{meta.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Description (e.g., Health Insurance)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1 min-w-[150px]"
      />
      <div className="flex gap-1">
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24"
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
      <Select value={frequency} onValueChange={(val) => setFrequency(val as Frequency)}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
          <SelectItem value="bi-monthly">Bi-monthly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="quarterly">Quarterly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="icon" className="shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default FixedExpenseForm;
