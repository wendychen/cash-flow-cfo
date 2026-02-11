import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, UtensilsCrossed, Sparkles, Users, Package, Repeat, TrendingUp, Building2, Info } from "lucide-react";
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, "id">) => void;
}

const ExpenseForm = ({ onAddExpense }: ExpenseFormProps) => {
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<ExpenseCategory>("misc");
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

    setCategory("misc");
    setDescription("");
    setAmount("");
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case "food": return <UtensilsCrossed className="h-4 w-4" />;
      case "lifestyle": return <Sparkles className="h-4 w-4" />;
      case "family": return <Users className="h-4 w-4" />;
      case "misc": return <Package className="h-4 w-4" />;
      case "opex": return <Repeat className="h-4 w-4" />;
      case "capex": return <TrendingUp className="h-4 w-4" />;
      case "gna": return <Building2 className="h-4 w-4" />;
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
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-96 p-4" side="top">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Spending Money: Expenses vs. Assets</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">Operating Expenses (OPEX):</p>
                      <ul className="list-disc list-inside ml-2 text-muted-foreground">
                        <li><strong>Subscription Fees:</strong> Monthly or annual payments for cloud storage (e.g., Google Drive, iCloud, or your Canva Pro subscription) are typically recorded as Software Expenses or Office Expenses. These are deducted from your income in the period they are paid.</li>
                        <li><strong>Consumables:</strong> Small items like USB sticks or cheap external hard drives are usually written off immediately as Supplies Expense or Miscellaneous Expenses.</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Capital Expenditures (CAPEX):</p>
                      <ul className="list-disc list-inside ml-2 text-muted-foreground">
                        <li><strong>Fixed Assets:</strong> If you buy expensive hardware (like a high-end NAS server) that lasts for several years, it is recorded as an Asset (Computer Equipment). Instead of being "spent" all at once, its cost is spread out over several years through Depreciation.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">2. Spending Time: Labor & Opportunity Cost</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Labor Costs:</strong> If an employee performs the backup, their salary for those hours is a Direct or Indirect Labor Cost. It is part of the General and Administrative (G&A) Expenses.</p>
                    <p><strong>Opportunity Cost (Management Accounting):</strong> In formal financial accounting, your personal time isn't "recorded" as a dollar amount on a balance sheet. However, in strategy, it is a massive Opportunity Cost. Every hour spent manually dragging files is an hour not spent on your "365-day content system" or business strategy.</p>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
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
