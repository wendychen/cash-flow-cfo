import { useState } from "react";
import { Pencil, Trash2, Check, X, RefreshCw, Home, Zap, Car, Heart, CreditCard, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FixedExpense, Frequency, getMonthlyEquivalent } from "@/types/fixedExpense";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { FixedExpenseCategory, FIXED_EXPENSE_CATEGORIES } from "@/types/expenseCategory";

interface FixedExpenseListProps {
  fixedExpenses: FixedExpense[];
  onUpdateFixedExpense: (id: string, updates: Partial<Omit<FixedExpense, "id">>) => void;
  onDeleteFixedExpense: (id: string) => void;
}

const frequencyLabels: Record<Frequency, string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  "bi-monthly": "Bi-monthly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
};

const frequencyColors: Record<Frequency, string> = {
  weekly: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bi-weekly": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bi-monthly": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  monthly: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  quarterly: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  yearly: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const FixedExpenseList = ({
  fixedExpenses,
  onUpdateFixedExpense,
  onDeleteFixedExpense,
}: FixedExpenseListProps) => {
  const { format, convertToNTD } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState<Frequency>("monthly");
  const [editCurrency, setEditCurrency] = useState<Currency>("NTD");
  const [editCategory, setEditCategory] = useState<FixedExpenseCategory>("housing");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const getCategoryIcon = (cat: FixedExpenseCategory) => {
    switch (cat) {
      case "housing": return <Home className="h-3 w-3" />;
      case "utilities": return <Zap className="h-3 w-3" />;
      case "transportation": return <Car className="h-3 w-3" />;
      case "health": return <Heart className="h-3 w-3" />;
      case "financial-obligations": return <CreditCard className="h-3 w-3" />;
      case "taxes": return <FileText className="h-3 w-3" />;
    }
  };

  const startEdit = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
    setEditFrequency(expense.frequency);
    setEditCurrency("NTD");
    setEditCategory(expense.category || "housing");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditAmount("");
    setEditFrequency("monthly");
    setEditCurrency("NTD");
    setEditCategory("housing");
  };

  const saveEdit = (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const amountInNTD = convertToNTD(parsedAmount, editCurrency);

    onUpdateFixedExpense(id, {
      description: editDescription.trim(),
      amount: amountInNTD,
      frequency: editFrequency,
      category: editCategory,
    });
    cancelEdit();
  };

  // Filter expenses by category
  const filteredExpenses = filterCategory === "all"
    ? fixedExpenses
    : fixedExpenses.filter(exp => exp.category === filterCategory);

  // Calculate total monthly equivalent for active expenses
  const totalMonthlyEquivalent = filteredExpenses
    .filter((exp) => exp.isActive)
    .reduce((sum, exp) => sum + getMonthlyEquivalent(exp.amount, exp.frequency), 0);

  if (fixedExpenses.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No fixed expenses yet. Add your recurring bills above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          <span>{filteredExpenses.length} fixed expense{filteredExpenses.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(FIXED_EXPENSE_CATEGORIES).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Monthly Equivalent</p>
          <p className="font-semibold text-foreground">{format(totalMonthlyEquivalent)}</p>
        </div>
      </div>

      {filteredExpenses.map((expense) => (
        <div
          key={expense.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            expense.isActive
              ? "bg-card border-border"
              : "bg-muted/50 border-muted opacity-60"
          }`}
        >
          {editingId === expense.id ? (
            <div className="flex-1 flex flex-wrap gap-2 items-center">
              <Select value={editCategory} onValueChange={(val) => setEditCategory(val as FixedExpenseCategory)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIXED_EXPENSE_CATEGORIES).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="flex-1 min-w-[120px]"
              />
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-24"
                  step="0.01"
                  min="0"
                />
                <Select value={editCurrency} onValueChange={(val) => setEditCurrency(val as Currency)}>
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
              <Select value={editFrequency} onValueChange={(val) => setEditFrequency(val as Frequency)}>
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
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => saveEdit(expense.id)}>
                  <Check className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Switch
                checked={expense.isActive}
                onCheckedChange={(checked) =>
                  onUpdateFixedExpense(expense.id, { isActive: checked })
                }
                className="data-[state=checked]:bg-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-medium truncate ${!expense.isActive ? "line-through" : ""}`}>
                    {expense.description}
                  </p>
                  <Badge variant="outline" className={`text-${FIXED_EXPENSE_CATEGORIES[expense.category || "housing"].color} border-current`}>
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(expense.category || "housing")}
                      <span className="text-xs">{FIXED_EXPENSE_CATEGORIES[expense.category || "housing"].label}</span>
                    </div>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(expense.amount)}{" "}
                  {expense.frequency !== "monthly" && (
                    <span className="text-xs">
                      (≈ {format(getMonthlyEquivalent(expense.amount, expense.frequency))}/mo)
                    </span>
                  )}
                </p>
              </div>
              <Badge variant="secondary" className={frequencyColors[expense.frequency]}>
                {frequencyLabels[expense.frequency]}
              </Badge>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(expense)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteFixedExpense(expense.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default FixedExpenseList;
