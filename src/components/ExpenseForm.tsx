import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, UtensilsCrossed, Sparkles, Users, Package } from "lucide-react";
import { Expense } from "@/types/expense";
import { useCurrency, Currency } from "@/hooks/use-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseCategory, EXPENSE_CATEGORIES } from "@/types/expenseCategory";

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, "id">) => void;
}

const ExpenseForm = ({ onAddExpense }: ExpenseFormProps) => {
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<Currency>("NTD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !date) return;

    const amountInNTD = convertToNTD(parseFloat(amount), inputCurrency);

    onAddExpense({
      date,
      description: description.trim(),
      amount: amountInNTD,
      needsCheck: false,
      category,
    });

    setCategory("miscellaneous");
    setDescription("");
    setAmount("");
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case "food": return <UtensilsCrossed className="h-4 w-4" />;
      case "lifestyle": return <Sparkles className="h-4 w-4" />;
      case "family": return <Users className="h-4 w-4" />;
      case "miscellaneous": return <Package className="h-4 w-4" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Category</label>
        <Select value={category} onValueChange={(val) => setCategory(val as ExpenseCategory)}>
          <SelectTrigger className="bg-card">
            <div className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(key as ExpenseCategory)}
                  <span>{meta.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-[2] min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
        <Input
          type="text"
          placeholder="Does it drive you away from Canada?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-[1.5] min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card flex-[3]"
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
      <Button type="submit" className="shrink-0">
        <Plus className="w-4 h-4 mr-1.5" />
        Add
      </Button>
    </form>
  );
};

export default ExpenseForm;
