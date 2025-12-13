import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Expense } from "@/types/expense";
import { useCurrency } from "@/hooks/use-currency";

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onToggleNeedsCheck: (id: string) => void;
  onUpdateExpense: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
}

const ExpenseList = ({
  expenses,
  onDeleteExpense,
  onToggleNeedsCheck,
  onUpdateExpense,
}: ExpenseListProps) => {
  const { format: formatCurrency } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditDescription(expense.description);
    setEditAmount(expense.amount.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditAmount("");
  };

  const saveEdit = (id: string) => {
    if (!editDescription.trim() || !editAmount) return;
    onUpdateExpense(id, {
      description: editDescription.trim(),
      amount: parseFloat(editAmount),
    });
    setEditingId(null);
  };

  const groupedExpenses = expenses.reduce((groups, expense) => {
    const date = expense.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  const sortedDates = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No expenses yet</p>
        <p className="text-sm mt-1">Add your first expense above</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayExpenses = groupedExpenses[date];
        const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        return (
          <div key={date} className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {format(parseISO(date), "EEEE, yyyy MMMM d")}
              </h3>
              <span className="text-sm font-medium text-primary">
                {formatCurrency(dayTotal)}
              </span>
            </div>
            <div className="space-y-2">
              {dayExpenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-slide-in ${
                    expense.needsCheck ? "ring-2 ring-yellow-400" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {editingId === expense.id ? (
                    <>
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="h-8 text-sm w-24"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => saveEdit(expense.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={expense.needsCheck}
                          onCheckedChange={() => onToggleNeedsCheck(expense.id)}
                          className="data-[state=checked]:bg-yellow-400 shrink-0"
                        />
                        <span className="text-foreground font-medium truncate">
                          {expense.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-semibold tabular-nums">
                          {formatCurrency(expense.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => startEdit(expense)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseList;
