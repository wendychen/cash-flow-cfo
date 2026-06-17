import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X, PiggyBank, Target, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Saving, SavingType } from "@/types/saving";
import { useCurrency, Currency } from "@/hooks/use-currency";
import { OriginalCurrencyBadge } from "@/features/shared";
import {
  buildStoredAmountFields,
  getEditAmountAndCurrency,
  shouldShowOriginalCurrencyBadge,
} from "@/lib/currencyEntry";
import { duplicateEntry } from "@/lib/duplicateEntry";
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
import { useI18n } from "@/i18n";

interface SavingListProps {
  savings: Saving[];
  onDeleteSaving: (id: string) => void;
  onUpdateSaving: (id: string, updates: Partial<Omit<Saving, "id">>) => void;
  onDuplicateSaving?: (saving: Omit<Saving, "id">) => void;
}

const ITEMS_PER_PAGE = 10;

const SavingList = ({
  savings,
  onDeleteSaving,
  onUpdateSaving,
  onDuplicateSaving,
}: SavingListProps) => {
  const { t } = useI18n();
  const { format: formatCurrency, currency, convertFromNTD, convertToNTD } = useCurrency();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<Currency>("USD");
  const [editNote, setEditNote] = useState("");
  const [editReviewCount, setEditReviewCount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSavingType, setEditSavingType] = useState<SavingType>("balance");
  const [currentPage, setCurrentPage] = useState(1);

  const startEdit = (saving: Saving) => {
    setEditingId(saving.id);
    const editValues = getEditAmountAndCurrency(saving, currency, convertFromNTD);
    setEditAmount(editValues.amount);
    setEditCurrency(editValues.currency);
    setEditNote(saving.note || "");
    setEditReviewCount(saving.reviewCount?.toString() || "");
    setEditDate(saving.date);
    setEditSavingType(saving.savingType || "balance");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditNote("");
    setEditReviewCount("");
    setEditDate("");
  };

  const saveEdit = (id: string) => {
    if (!editAmount || !editDate) return;
    const stored = buildStoredAmountFields(
      parseFloat(editAmount),
      editCurrency,
      convertToNTD
    );
    onUpdateSaving(id, {
      ...stored,
      note: editNote.trim() || undefined,
      reviewCount: editReviewCount ? parseInt(editReviewCount) : undefined,
      date: editDate,
      savingType: editSavingType,
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
        <p className="text-lg">{t('savings.list.empty')}</p>
        <p className="text-sm mt-1">{t('savings.list.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {paginatedSavings.map((saving, index) => (
        <div
          key={saving.id}
          className={`relative flex items-center justify-between p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-fade-in ring-1 ${
            saving.savingType === "goal" 
              ? "ring-purple-200 dark:ring-purple-900" 
              : "ring-emerald-200 dark:ring-emerald-900"
          } ${shouldShowOriginalCurrencyBadge(saving.originalCurrency) ? "pt-6" : ""}`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {editingId !== saving.id && (
            <OriginalCurrencyBadge
              originalAmount={saving.originalAmount}
              originalCurrency={saving.originalCurrency}
            />
          )}
          {editingId === saving.id ? (
            <>
              <div className="flex-1 flex items-center gap-2 mr-2 flex-wrap">
                <Select value={editSavingType} onValueChange={(val) => setEditSavingType(val as SavingType)}>
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">{t('savings.type.balance')}</SelectItem>
                    <SelectItem value="goal">{t('savings.type.goal')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-8 text-sm w-32"
                />
                <Input
                  type="number"
                  value={editReviewCount}
                  onChange={(e) => setEditReviewCount(e.target.value)}
                  placeholder={t('forms.review')}
                  className="h-8 text-sm w-16"
                  min="0"
                />
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t('forms.note')}
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
                <Badge 
                  variant="outline" 
                  className={`shrink-0 ${
                    saving.savingType === "goal"
                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  {saving.savingType === "goal" ? (
                    <><Target className="w-3 h-3 mr-1" />{t('savings.type.goal')}</>
                  ) : (
                    <><PiggyBank className="w-3 h-3 mr-1" />{t('savings.type.balance')}</>
                  )}
                </Badge>
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
                <span className={`font-semibold tabular-nums whitespace-nowrap min-w-[80px] text-right ${
                  saving.savingType === "goal"
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {formatCurrency(saving.amount)}
                </span>
                {onDuplicateSaving && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-100"
                    title={t('forms.duplicate')}
                    onClick={() => onDuplicateSaving(duplicateEntry(saving))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
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
        <Pagination className="mt-6 w-full">
          <PaginationContent className="flex flex-wrap gap-1 max-w-full overflow-hidden">
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {(() => {
              const pages: (number | string)[] = [];
              const delta = 1;
              pages.push(1);
              if (currentPage - delta > 2) pages.push("...");
              for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                pages.push(i);
              }
              if (currentPage + delta < totalPages - 1) pages.push("...");
              if (totalPages > 1) pages.push(totalPages);

              return pages.map((page, idx) =>
                page === "..." ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              );
            })()}

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
