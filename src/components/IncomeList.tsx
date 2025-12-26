import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Income } from "@/types/income";
import { useCurrency } from "@/hooks/use-currency";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface IncomeListProps {
  incomes: Income[];
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, updates: Partial<Omit<Income, "id">>) => void;
}

const ITEMS_PER_PAGE = 10;

const IncomeList = ({
  incomes,
  onDeleteIncome,
  onUpdateIncome,
}: IncomeListProps) => {
  const { format: formatCurrency } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditSource(income.source);
    setEditAmount(income.amount.toString());
    setEditNote(income.note || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSource("");
    setEditAmount("");
    setEditNote("");
  };

  const saveEdit = (id: string) => {
    if (!editAmount || !editSource.trim()) return;
    onUpdateIncome(id, {
      source: editSource.trim(),
      amount: parseFloat(editAmount),
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  };

  // Group by date
  const groupedByDate = incomes.reduce((acc, income) => {
    if (!acc[income.date]) acc[income.date] = [];
    acc[income.date].push(income);
    return acc;
  }, {} as Record<string, Income[]>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Pagination logic
  const totalPages = Math.ceil(sortedDates.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDates = sortedDates.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (incomes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No income records yet</p>
        <p className="text-sm mt-1">Add your first income above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paginatedDates.map((date) => {
        const dayIncomes = groupedByDate[date];
        const dayTotal = dayIncomes.reduce((sum, inc) => sum + inc.amount, 0);

        return (
          <div key={date} className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {format(parseISO(date), "EEEE, yyyy MMMM d")}
              </h3>
              <span className="text-sm font-medium text-violet-600">
                {formatCurrency(dayTotal)}
              </span>
            </div>

            <div className="space-y-2">
              {dayIncomes.map((income, index) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 ring-1 ring-violet-200 dark:ring-violet-900"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {editingId === income.id ? (
                    <>
                      <div className="flex-1 flex items-center gap-2 mr-2 flex-wrap">
                        <Input
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          placeholder="Source"
                          className="h-8 text-sm flex-1 min-w-24"
                        />
                        <Input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Note"
                          className="h-8 text-sm flex-1 min-w-24"
                        />
                        <Input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="h-8 text-sm w-28"
                          step="0.01"
                          min="0"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                          onClick={() => saveEdit(income.id)}
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
                        <span className="font-medium text-foreground">{income.source}</span>
                        {income.note && (
                          <span className="text-sm text-muted-foreground truncate">
                            {income.note}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-violet-600 dark:text-violet-400 font-semibold tabular-nums">
                          +{formatCurrency(income.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-100"
                          onClick={() => startEdit(income)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteIncome(income.id)}
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

export default IncomeList;
