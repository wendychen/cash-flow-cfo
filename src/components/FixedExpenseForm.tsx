import { useState } from "react";
import { Plus, Home, Zap, Car, Heart, CreditCard, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FixedExpense, Frequency } from "@/types/fixedExpense";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { FixedExpenseCategory, FIXED_EXPENSE_CATEGORIES } from "@/types/expenseCategory";

interface FixedExpenseFormProps {
  onAddFixedExpense: (expense: Omit<FixedExpense, "id" | "createdAt">) => void;
}

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

  const getCategoryIcon = (cat: FixedExpenseCategory) => {
    switch (cat) {
      case "housing": return <Home className="h-4 w-4" />;
      case "utilities": return <Zap className="h-4 w-4" />;
      case "transportation": return <Car className="h-4 w-4" />;
      case "health": return <Heart className="h-4 w-4" />;
      case "financial-obligations": return <CreditCard className="h-4 w-4" />;
      case "taxes": return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <Select value={category} onValueChange={(val) => setCategory(val as FixedExpenseCategory)}>
        <SelectTrigger className="w-[180px]">
          <div className="flex items-center gap-2">
            {getCategoryIcon(category)}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(FIXED_EXPENSE_CATEGORIES).map(([key, meta]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                1
                {getCategoryIcon(key as FixedExpenseCategory)}
                1
                <span>{meta.label}</span>
              </div>
            </SelectItem>
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
