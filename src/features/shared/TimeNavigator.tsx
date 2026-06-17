import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { format } from "date-fns";
import { enUS, zhTW, ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getWeeksInMonth } from "@/lib/date";
import { getNavigatorYears } from "@/lib/timeNavigatorYears";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n, type Locale } from "@/i18n";
import type { TimePeriod } from "@/types/timePeriod";

interface TimeNavigatorProps {
  selectedPeriod: TimePeriod | null;
  onSelectPeriod: (period: TimePeriod | null) => void;
  currentYear?: number;
}

const QUARTERS = [
  { name: "Q1", months: [0, 1, 2] },
  { name: "Q2", months: [3, 4, 5] },
  { name: "Q3", months: [6, 7, 8] },
  { name: "Q4", months: [9, 10, 11] },
];

const DATE_FNS_LOCALES = {
  en: enUS,
  "zh-TW": zhTW,
  ja,
} as const;

function formatDateRange(start: Date, end: Date): string {
  const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
  const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startStr} - ${endStr}`;
}

function monthLabel(year: number, monthIndex: number, locale: Locale): string {
  const date = new Date(year, monthIndex, 1);
  return format(date, "MMM", { locale: DATE_FNS_LOCALES[locale] });
}

export default function TimeNavigator({ selectedPeriod, onSelectPeriod, currentYear }: TimeNavigatorProps) {
  const { t, locale } = useI18n();
  const anchorYear = currentYear || new Date().getFullYear();
  const years = useMemo(() => getNavigatorYears(anchorYear), [anchorYear]);
  const focusYear = selectedPeriod?.year ?? anchorYear;

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set([anchorYear]));
  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, Set<number>>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<number, Set<number>>>({});
  const [expandAll, setExpandAll] = useState(false);

  const isPeriodSelected = (period: TimePeriod): boolean => {
    if (!selectedPeriod) return false;
    return (
      period.type === selectedPeriod.type &&
      period.year === selectedPeriod.year &&
      period.quarter === selectedPeriod.quarter &&
      period.month === selectedPeriod.month &&
      period.week === selectedPeriod.week
    );
  };

  const handleSelectPeriod = (period: TimePeriod) => {
    if (isPeriodSelected(period)) {
      onSelectPeriod(null);
    } else {
      onSelectPeriod(period);
    }
  };

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
    setExpandAll(false);
  };

  const toggleQuarter = (year: number, quarterIndex: number) => {
    setExpandedQuarters((prev) => {
      const yearSet = new Set(prev[year] ?? []);
      if (yearSet.has(quarterIndex)) yearSet.delete(quarterIndex);
      else yearSet.add(quarterIndex);
      return { ...prev, [year]: yearSet };
    });
    setExpandAll(false);
  };

  const toggleMonth = (year: number, monthIndex: number) => {
    setExpandedMonths((prev) => {
      const yearSet = new Set(prev[year] ?? []);
      if (yearSet.has(monthIndex)) yearSet.delete(monthIndex);
      else yearSet.add(monthIndex);
      return { ...prev, [year]: yearSet };
    });
    setExpandAll(false);
  };

  const handleExpandAllToggle = (checked: boolean) => {
    setExpandAll(checked);
    if (checked) {
      setExpandedYears(new Set(years));
      setExpandedQuarters({ [focusYear]: new Set([0, 1, 2, 3]) });
      setExpandedMonths({ [focusYear]: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) });
    } else {
      setExpandedYears(new Set([focusYear]));
      setExpandedQuarters({});
      setExpandedMonths({});
    }
  };

  const renderYear = (year: number) => {
    const yearPeriod: TimePeriod = {
      type: "year",
      year,
      label: year.toString(),
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
    };
    const yearQuarters = expandedQuarters[year] ?? new Set<number>();
    const yearMonths = expandedMonths[year] ?? new Set<number>();

    return (
      <div key={year}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate transition-colors",
            isPeriodSelected(yearPeriod) && "bg-primary/10 text-primary",
            year === anchorYear && "ring-1 ring-primary/20"
          )}
          data-testid={`time-nav-year-${year}`}
        >
          <button
            onClick={() => toggleYear(year)}
            className="p-0.5"
            data-testid={`toggle-year-${year}`}
          >
            {expandedYears.has(year) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <span
            onClick={() => handleSelectPeriod(yearPeriod)}
            className="flex-1 text-sm font-semibold"
          >
            {year}
          </span>
        </div>

        {expandedYears.has(year) && (
          <div className="ml-4 space-y-0.5">
            {QUARTERS.map((quarter, qIndex) => {
              const quarterPeriod: TimePeriod = {
                type: "quarter",
                year,
                quarter: qIndex + 1,
                label: `${quarter.name} ${year}`,
                startDate: new Date(year, quarter.months[0], 1),
                endDate: new Date(year, quarter.months[2] + 1, 0),
              };

              return (
                <div key={`${year}-${quarter.name}`}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors",
                      isPeriodSelected(quarterPeriod) && "bg-primary/10 text-primary"
                    )}
                    data-testid={`time-nav-quarter-${year}-${qIndex + 1}`}
                  >
                    <button
                      onClick={() => toggleQuarter(year, qIndex)}
                      className="p-0.5"
                    >
                      {yearQuarters.has(qIndex) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span
                      onClick={() => handleSelectPeriod(quarterPeriod)}
                      className="flex-1 text-sm"
                    >
                      {quarter.name}
                    </span>
                  </div>

                  {yearQuarters.has(qIndex) && (
                    <div className="ml-4 space-y-0.5">
                      {quarter.months.map((monthIndex) => {
                        const monthPeriod: TimePeriod = {
                          type: "month",
                          year,
                          quarter: qIndex + 1,
                          month: monthIndex + 1,
                          label: `${monthLabel(year, monthIndex, locale)} ${year}`,
                          startDate: new Date(year, monthIndex, 1),
                          endDate: new Date(year, monthIndex + 1, 0),
                        };
                        const weeks = getWeeksInMonth(year, monthIndex);

                        return (
                          <div key={`${year}-${monthIndex}`}>
                            <div
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors",
                                isPeriodSelected(monthPeriod) && "bg-primary/10 text-primary"
                              )}
                              data-testid={`time-nav-month-${year}-${monthIndex + 1}`}
                            >
                              <button
                                onClick={() => toggleMonth(year, monthIndex)}
                                className="p-0.5"
                              >
                                {yearMonths.has(monthIndex) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                              <span
                                onClick={() => handleSelectPeriod(monthPeriod)}
                                className="flex-1 text-sm"
                              >
                                {monthLabel(year, monthIndex, locale)}
                              </span>
                            </div>

                            {yearMonths.has(monthIndex) && (
                              <div className="ml-4 space-y-0.5">
                                {weeks.map((weekData) => {
                                  const weekPeriod: TimePeriod = {
                                    type: "week",
                                    year,
                                    quarter: qIndex + 1,
                                    month: monthIndex + 1,
                                    week: weekData.week,
                                    label: `Week ${weekData.week}, ${monthLabel(year, monthIndex, locale)} ${year}`,
                                    startDate: weekData.startDate,
                                    endDate: weekData.endDate,
                                  };

                                  return (
                                    <div
                                      key={`${year}-${monthIndex}-${weekData.week}`}
                                      onClick={() => handleSelectPeriod(weekPeriod)}
                                      className={cn(
                                        "px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors text-xs",
                                        isPeriodSelected(weekPeriod) && "bg-primary/10 text-primary"
                                      )}
                                      data-testid={`time-nav-week-${year}-${monthIndex + 1}-${weekData.week}`}
                                    >
                                      <span className="font-medium">W{weekData.week}</span>
                                      <span className="text-muted-foreground ml-1">
                                        {formatDateRange(weekData.startDate, weekData.endDate)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-4 w-full" data-testid="time-navigator">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{t("timeNav.title")}</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {t("timeNav.yearRange", { start: years[0], end: years[years.length - 1] })}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Switch
          id="expand-all"
          checked={expandAll}
          onCheckedChange={handleExpandAllToggle}
        />
        <Label htmlFor="expand-all" className="text-sm text-muted-foreground cursor-pointer">
          {t("timeNav.expandAll")}
        </Label>
      </div>

      <ScrollArea className="h-[min(420px,55vh)] pr-2">
        <div className="space-y-1">
          {[...years].reverse().map((year) => renderYear(year))}
        </div>
      </ScrollArea>

      {selectedPeriod && (
        <div className="mt-3 pt-2 border-t">
          <div className="text-xs text-muted-foreground">{t("timeNav.selected")}</div>
          <div className="text-sm font-medium text-primary">{selectedPeriod.label}</div>
          <button
            onClick={() => onSelectPeriod(null)}
            className="text-xs text-muted-foreground underline mt-1 hover:text-foreground"
            data-testid="clear-time-selection"
          >
            {t("timeNav.clear")}
          </button>
        </div>
      )}
    </div>
  );
}