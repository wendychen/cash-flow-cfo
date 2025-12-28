import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Saving } from "@/types/saving";
import { useCurrency } from "@/hooks/use-currency";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SavingListProps {
  savings: Saving[];
  onDeleteSaving: (id: string) => void;
  onUpdateSaving: (id: string, updates: Partial<Omit<Saving, "id">>) => void;
}

const ITEMS_PER_PAGE = 10;

const SavingList = ({
  savings,
  onDeleteSaving,
  onUpdateSaving,
}: SavingListProps) => {
  const { format: formatCurrency } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const startEdit = (saving: Saving) => {
    setEditingId(saving.id);
    setEditAmount(saving.amount.toString());
    setEditNote(saving.note || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditNote("");
  };

  const saveEdit = (id: string) => {
    if (!editAmount) return;
    onUpdateSaving(id, {
      amount: parseFloat(editAmount),
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  };

  const sortedSavings = [...savings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Pagination logic
  const totalPages = Math.ceil(sortedSavings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSavings = sortedSavings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (savings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No savings records yet</p>
        <p className="text-sm mt-1">Add your first savings balance above</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {paginatedSavings.map((saving, index) => (
        <div
          key={saving.id}
          className="flex items-center justify-between p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in ring-1 ring-emerald-200 dark:ring-emerald-900"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {editingId === saving.id ? (
            <>
              <div className="flex-1 flex items-center gap-2 mr-2">
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Note"
                  className="h-8 text-sm"
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
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                  onClick={() => saveEdit(saving.id)}
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
                  value={saving.reviewCount || ""}
                  onChange={(e) => onUpdateSaving(saving.id, { reviewCount: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="0"
                  className="h-7 w-12 text-xs text-center shrink-0"
                />
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(saving.date), "MMM d, yyyy")}
                </span>
                {saving.note && (
                  <span className="text-foreground truncate">{saving.note}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                  {formatCurrency(saving.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-100"
                  onClick={() => startEdit(saving)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteSaving(saving.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

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

export default SavingList;
