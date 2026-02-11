import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X, UtensilsCrossed, Sparkles, Users, Package, Filter, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Expense } from "@/types/expense";
import { Goal } from "@/types/goal";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onToggleNeedsCheck: (id: string) => void;
  onUpdateExpense: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  goals?: Goal[];
}

const ITEMS_PER_PAGE = 10;

const ExpenseList = ({
  expenses,
  onDeleteExpense,
  onToggleNeedsCheck,
  onUpdateExpense,
  goals = [],
}: ExpenseListProps) => {
  const { format: formatCurrency, currency, convertFromNTD, convertToNTD } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editTimeCost, setEditTimeCost] = useState("");
  const [editCurrency, setEditCurrency] = useState<Currency>("NTD");
  const [editReviewCount, setEditReviewCount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("misc");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const getCategoryIcon = (cat: ExpenseCategory) => {
    const category = EXPENSE_CATEGORIES[cat];
    if (!category) {
      return <Package className="h-3 w-3" />;
    }
    const iconName = category.icon;

    switch (iconName) {
      case "UtensilsCrossed": return <UtensilsCrossed className="h-3 w-3" />;
      case "Sparkles": return <Sparkles className="h-3 w-3" />;
      case "Users": return <Users className="h-3 w-3" />;
      case "Package": return <Package className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  const getGoalTitle = (goalId: string | undefined) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditDescription(expense.description);
    // Convert stored NTD to current display currency for editing
    setEditAmount(convertFromNTD(expense.amount, currency).toFixed(currency === "NTD" ? 0 : 2));
    setEditTimeCost(expense.timeCost || "");
    setEditCurrency(currency);
    setEditReviewCount(expense.reviewCount?.toString() || "");
    setEditDate(expense.date);
    setEditCategory(expense.category || "misc");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDescription("");
    setEditAmount("");
    setEditTimeCost("");
    setEditReviewCount("");
    setEditDate("");
    setEditCategory("misc");
  };

  const saveEdit = (id: string) => {
    if (!editDescription.trim() || !editAmount || !editDate) return;
    const amountInNTD = convertToNTD(parseFloat(editAmount), editCurrency);
    onUpdateExpense(id, {
      description: editDescription.trim(),
      amount: amountInNTD,
      timeCost: editTimeCost.trim(),
      reviewCount: editReviewCount ? parseInt(editReviewCount) : undefined,
      date: editDate,
      category: editCategory,
    });
    setEditingId(null);
  };

  // Filter expenses by category
  const filteredExpenses = filterCategory === "all"
    ? expenses
    : expenses.filter(exp => exp.category === filterCategory);

  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
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

  // Pagination logic
  const totalPages = Math.ceil(sortedDates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDates = sortedDates.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
        </span>
      </div>

      {paginatedDates.map((date) => {
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
              {dayExpenses.map((expense, index) => {
                let categoryKey = (expense.category || "misc") as ExpenseCategory;
                if (!(categoryKey in EXPENSE_CATEGORIES)) {
                  categoryKey = "misc";
                }
                const categoryMeta = EXPENSE_CATEGORIES[categoryKey];

                console.log(categoryKey);
                console.log(categoryMeta);
                return (
                  <div
                    key={expense.id}
                    className={`flex items-center justify-between p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-slide-in ${
                      expense.needsCheck ? "ring-2 ring-yellow-400" : ""
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {editingId === expense.id ? (
                      <>
                        <div className="flex-1 flex items-center gap-2 mr-2 flex-wrap">
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-8 text-sm w-32"
                          />
                          <Select value={editCategory} onValueChange={(val) => setEditCategory(val as ExpenseCategory)}>
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(EXPENSE_CATEGORIES).map(([key, meta]) => (
                                <SelectItem key={key} value={key}>
                                  {meta.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={editReviewCount}
                            onChange={(e) => setEditReviewCount(e.target.value)}
                            placeholder="Review"
                            className="h-8 text-sm w-16"
                            min="0"
                          />
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="h-8 text-sm flex-1 min-w-24"
                            autoFocus
                          />
                          <Input
                            value={editTimeCost}
                            onChange={(e) => setEditTimeCost(e.target.value)}
                            placeholder="Time"
                            className="h-8 text-sm w-20"
                          />
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="h-8 text-sm w-24"
                              step="0.01"
                              min="0"
                            />
                            <Select value={editCurrency} onValueChange={(val) => setEditCurrency(val as Currency)}>
                              <SelectTrigger className="h-8 w-16 text-xs">
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
                          <Input
                            type="number"
                            min="0"
                            value={expense.reviewCount || ""}
                            onChange={(e) => onUpdateExpense(expense.id, { reviewCount: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="0"
                            className="h-7 w-12 text-xs text-center shrink-0"
                          />
                          <Switch
                            checked={expense.needsCheck}
                            onCheckedChange={() => onToggleNeedsCheck(expense.id)}
                            className="data-[state=checked]:bg-yellow-400 shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className={`${categoryMeta.color} border-current shrink-0`}>
                              <div className="flex items-center gap-1">
                                {getCategoryIcon(categoryKey)}
                                <span className="text-xs">{categoryMeta.label}</span>
                              </div>
                            </Badge>
                            <span className="text-foreground font-medium truncate">
                              {expense.description}
                            </span>
                            {expense.timeCost && (
                              <Badge variant="outline" className="text-teal-600 border-teal-600 shrink-0 text-[10px] px-1 py-0 h-4">
                                {expense.timeCost}
                              </Badge>
                            )}
                            {expense.linkedGoalId && (
                              <>
                                <Link
                                  className="h-3 w-3 text-blue-500 shrink-0"
                                  title={`Linked to goal ${expense.linkedTaskType ? `(${expense.linkedTaskType})` : ''}`}
                                />
                                {getGoalTitle(expense.linkedGoalId) && (
                                  <Badge variant="outline" className="text-blue-500 border-blue-500 shrink-0 text-[10px] px-1 py-0 h-4">
                                    {getGoalTitle(expense.linkedGoalId)}
                                    {expense.linkedTaskType && ` (${expense.linkedTaskType})`}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
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
              )
            })}
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ExpenseList;
