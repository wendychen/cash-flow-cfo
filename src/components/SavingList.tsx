import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Saving } from "@/types/saving";
import { useCurrency, Currency } from "@/hooks/use-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { format: formatCurrency, currency, convertFromNTD, convertToNTD } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<Currency>("NTD");
  const [editNote, setEditNote] = useState("");
  const [editReviewCount, setEditReviewCount] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const startEdit = (saving: Saving) => {
    setEditingId(saving.id);
    // Convert stored NTD to current display currency for editing
    setEditAmount(convertFromNTD(saving.amount, currency).toFixed(currency === "NTD" ? 0 : 2));
    setEditCurrency(currency);
    setEditNote(saving.note || "");
    setEditReviewCount(saving.reviewCount?.toString() || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditNote("");
    setEditReviewCount("");
  };

  const saveEdit = (id: string) => {
    if (!editAmount) return;
    const amountInNTD = convertToNTD(parseFloat(editAmount), editCurrency);
    onUpdateSaving(id, {
      amount: amountInNTD,
      note: editNote.trim() || undefined,
      reviewCount: editReviewCount ? parseInt(editReviewCount) : undefined,
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
              <div className="flex-1 flex items-center gap-2 mr-2 flex-wrap">
                <Input
                  type="number"
                  value={editReviewCount}
                  onChange={(e) => setEditReviewCount(e.target.value)}
                  placeholder="Review"
                  className="h-8 text-sm w-16"
                  min="0"
                />
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Note"
                  className="h-8 text-sm flex-1 min-w-24"
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-8 text-sm w-24"
                    step="0.01"
                    min="0"
                    autoFocus
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
