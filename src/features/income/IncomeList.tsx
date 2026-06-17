import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Pencil, Check, X, Banknote, Clock, Copy, ArrowDownToLine } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import IncomeCollectForm from "./IncomeCollectForm";
import {
  getAccruedCollectionStatus,
  getCollectionsForAccrued,
  isAccruedCollection,
} from "@/lib/incomeConversion";
import type { AccruedCollectionResult, IncomeUpdateResult } from "@/stores";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Income, IncomeType } from "@/types/income";
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

interface IncomeListProps {
  incomes: Income[];
  allIncomes?: Income[];
  onDeleteIncome: (id: string) => void;
  onUpdateIncome: (id: string, updates: Partial<Omit<Income, "id">>) => IncomeUpdateResult;
  onDuplicateIncome?: (income: Omit<Income, "id">) => void;
  onRecordCollection?: (
    accruedId: string,
    collection: { date: string; amount: number; note?: string }
  ) => AccruedCollectionResult;
}

const ITEMS_PER_PAGE = 10;

const IncomeList = ({
  incomes,
  allIncomes,
  onDeleteIncome,
  onUpdateIncome,
  onDuplicateIncome,
  onRecordCollection,
}: IncomeListProps) => {
  const { t } = useI18n();
  const incomePool = allIncomes ?? incomes;
  const { format: formatCurrency, currency, convertFromNTD, convertToNTD } = useCurrency();
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<Currency>("USD");
  const [editIncomeType, setEditIncomeType] = useState<IncomeType>("cash");
  const [editNote, setEditNote] = useState("");
  const [editReviewCount, setEditReviewCount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditError(null);
    setEditSource(income.source);
    const editValues = getEditAmountAndCurrency(income, currency, convertFromNTD);
    setEditAmount(editValues.amount);
    setEditCurrency(editValues.currency);
    setEditIncomeType(income.incomeType || "cash");
    setEditNote(income.note || "");
    setEditReviewCount(income.reviewCount?.toString() || "");
    setEditDate(income.date);
  };

  const handleDeleteIncome = (income: Income) => {
    if (income.incomeType === "accrued") {
      const linkedCount = getCollectionsForAccrued(income.id, incomePool).length;
      if (linkedCount > 0 && !confirm(t("income.list.deleteAccruedConfirm", { count: linkedCount }))) {
        return;
      }
    }
    onDeleteIncome(income.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
    setEditSource("");
    setEditAmount("");
    setEditIncomeType("cash");
    setEditNote("");
    setEditReviewCount("");
    setEditDate("");
  };

  const saveEdit = (id: string) => {
    if (!editAmount || !editSource.trim() || !editDate) return;
    const stored = buildStoredAmountFields(
      parseFloat(editAmount),
      editCurrency,
      convertToNTD
    );
    const result = onUpdateIncome(id, {
      source: editSource.trim(),
      ...stored,
      incomeType: editIncomeType,
      note: editNote.trim() || undefined,
      reviewCount: editReviewCount ? parseInt(editReviewCount) : undefined,
      date: editDate,
    });
    if (!result.ok) {
      setEditError(t(result.errorKey));
      return;
    }
    setEditError(null);
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
        <p className="text-lg">{t('income.list.empty')}</p>
        <p className="text-sm mt-1">{t('income.list.emptyHint')}</p>
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
              {dayIncomes.map((income, index) => {
                const collectionStatus =
                  income.incomeType === "accrued"
                    ? getAccruedCollectionStatus(income, incomePool)
                    : null;
                const collectionHistory =
                  income.incomeType === "accrued"
                    ? getCollectionsForAccrued(income.id, incomePool).sort((a, b) =>
                        a.date.localeCompare(b.date)
                      )
                    : [];
                const linkedAccrued =
                  income.linkedAccruedIncomeId &&
                  incomePool.find((i) => i.id === income.linkedAccruedIncomeId);
                const incomeTypeLocked =
                  isAccruedCollection(income) || collectionHistory.length > 0;

                return (
                <div key={income.id} className="space-y-0">
                <div
                  className={`relative flex flex-col gap-2 p-3 bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-200 ring-1 ring-violet-200 dark:ring-violet-900 ${
                    shouldShowOriginalCurrencyBadge(income.originalCurrency) ? "pt-6" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {editingId !== income.id && (
                    <OriginalCurrencyBadge
                      originalAmount={income.originalAmount}
                      originalCurrency={income.originalCurrency}
                    />
                  )}
                  {collectionStatus && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                        <span>
                          {t('income.collection.collected')}: {formatCurrency(collectionStatus.collected)}
                        </span>
                        <span>
                          {t('income.collection.outstanding')}: {formatCurrency(collectionStatus.outstanding)}
                        </span>
                      </div>
                      <Progress value={collectionStatus.percentCollected} className="h-1.5" />
                      {collectionHistory.length > 0 && (
                        <div className="pt-1 space-y-0.5">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {t('income.collection.history')}
                          </p>
                          <ul className="space-y-0.5">
                            {collectionHistory.map((collection) => (
                              <li
                                key={collection.id}
                                className="flex justify-between gap-2 text-[11px] text-muted-foreground tabular-nums"
                              >
                                <span className="truncate">
                                  {format(parseISO(collection.date), "yyyy MMM d")}
                                  {collection.note ? ` · ${collection.note}` : ""}
                                </span>
                                <span className="text-teal-600 dark:text-teal-400 shrink-0">
                                  +{formatCurrency(collection.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {editingId === income.id ? (
                    <>
                      <div className="flex flex-1 items-center gap-2 mr-2 flex-wrap">
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-8 text-sm w-32"
                        />
                        <Select
                          value={editIncomeType}
                          disabled={incomeTypeLocked}
                          onValueChange={(val) => {
                            setEditIncomeType(val as IncomeType);
                            setEditError(null);
                          }}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs" disabled={incomeTypeLocked}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('income.type.cash')}</SelectItem>
                            <SelectItem value="accrued">{t('income.type.accrued')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editReviewCount}
                          onChange={(e) => setEditReviewCount(e.target.value)}
                          placeholder={t('income.list.review')}
                          className="h-8 text-sm w-16"
                          min="0"
                        />
                        <Input
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          placeholder={t('income.list.source')}
                          className="h-8 text-sm flex-1 min-w-24"
                        />
                        <Input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder={t('income.list.note')}
                          className="h-8 text-sm flex-1 min-w-24"
                        />
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => {
                              setEditAmount(e.target.value);
                              setEditError(null);
                            }}
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
                      {editError && (
                        <p className="text-xs text-destructive w-full">{editError}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Input
                          type="number"
                          min="0"
                          value={income.reviewCount || ""}
                          onChange={(e) => onUpdateIncome(income.id, { reviewCount: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder={t('forms.reviewCountPlaceholder')}
                          className="h-7 w-12 text-xs text-center shrink-0"
                        />
                        <Badge 
                          variant="outline" 
                          className={`shrink-0 text-xs ${
                            income.incomeType === "accrued" 
                              ? "border-amber-500 text-amber-600 dark:text-amber-400" 
                              : isAccruedCollection(income)
                              ? "border-teal-500 text-teal-600 dark:text-teal-400"
                              : "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {income.incomeType === "accrued" ? (
                            <><Clock className="w-3 h-3 mr-1" />{t('income.type.accrued')}</>
                          ) : isAccruedCollection(income) ? (
                            <><ArrowDownToLine className="w-3 h-3 mr-1" />{t('income.type.collection')}</>
                          ) : (
                            <><Banknote className="w-3 h-3 mr-1" />{t('income.type.cash')}</>
                          )}
                        </Badge>
                        {linkedAccrued && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {t('income.collection.fromAccrued', { source: linkedAccrued.source })}
                          </span>
                        )}
                        <span className="font-medium text-foreground">{income.source}</span>
                        {income.note && (
                          <span className="text-sm text-muted-foreground truncate">
                            {income.note}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {income.incomeType === "accrued" &&
                          onRecordCollection &&
                          collectionStatus &&
                          !collectionStatus.isFullyCollected && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                              onClick={() =>
                                setCollectingId(collectingId === income.id ? null : income.id)
                              }
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
                              {t('income.collection.record')}
                            </Button>
                          )}
                        <span className="text-violet-600 dark:text-violet-400 font-semibold tabular-nums whitespace-nowrap min-w-[90px] text-right">
                          +{formatCurrency(income.amount)}
                        </span>
                        {onDuplicateIncome && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-100"
                            title={t('income.list.duplicate')}
                            onClick={() => onDuplicateIncome(duplicateEntry(income))}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
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
                          onClick={() => handleDeleteIncome(income)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      </div>
                    </>
                  )}
                </div>
                {collectingId === income.id && onRecordCollection && (
                  <IncomeCollectForm
                    accrued={income}
                    allIncomes={incomePool}
                    onCollect={onRecordCollection}
                    onCancel={() => setCollectingId(null)}
                  />
                )}
                </div>
              );
              })}
            </div>
          </div>
        );
      })}

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

export default IncomeList;
