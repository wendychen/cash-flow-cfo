import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type TimePeriod = {
  type: "year" | "quarter" | "month" | "week";
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  label: string;
  startDate: Date;
  endDate: Date;
};

interface TimeNavigatorProps {
  selectedPeriod: TimePeriod | null;
  onSelectPeriod: (period: TimePeriod | null) => void;
  currentYear?: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const QUARTERS = [
  { name: "Q1", months: [0, 1, 2] },
  { name: "Q2", months: [3, 4, 5] },
  { name: "Q3", months: [6, 7, 8] },
  { name: "Q4", months: [9, 10, 11] },
];

function getWeeksInMonth(year: number, month: number): { week: number; startDate: Date; endDate: Date }[] {
  const weeks: { week: number; startDate: Date; endDate: Date }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let currentDate = new Date(firstDay);
  let weekNum = 1;
  
  while (currentDate <= lastDay) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    if (weekEnd > lastDay) {
      weekEnd.setTime(lastDay.getTime());
    }
    
    weeks.push({
      week: weekNum,
      startDate: weekStart,
      endDate: weekEnd,
    });
    
    currentDate = new Date(weekEnd);
    currentDate.setDate(currentDate.getDate() + 1);
    weekNum++;
  }
  
  return weeks;
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
  const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startStr} - ${endStr}`;
}

export default function TimeNavigator({ selectedPeriod, onSelectPeriod, currentYear }: TimeNavigatorProps) {
  const year = currentYear || new Date().getFullYear();
  const [expandedYear, setExpandedYear] = useState<number | null>(year);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const yearPeriod: TimePeriod = useMemo(() => ({
    type: "year",
    year,
    label: year.toString(),
    startDate: new Date(year, 0, 1),
    endDate: new Date(year, 11, 31),
  }), [year]);

  const toggleQuarter = (quarterIndex: number) => {
    const newSet = new Set(expandedQuarters);
    if (newSet.has(quarterIndex)) {
      newSet.delete(quarterIndex);
      setExpandAll(false);
    } else {
      newSet.add(quarterIndex);
    }
    setExpandedQuarters(newSet);
  };

  const toggleMonth = (monthIndex: number) => {
    const newSet = new Set(expandedMonths);
    if (newSet.has(monthIndex)) {
      newSet.delete(monthIndex);
      setExpandAll(false);
    } else {
      newSet.add(monthIndex);
    }
    setExpandedMonths(newSet);
  };

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

  const handleExpandAllToggle = (checked: boolean) => {
    setExpandAll(checked);
    if (checked) {
      setExpandedYear(year);
      setExpandedQuarters(new Set([0, 1, 2, 3]));
      setExpandedMonths(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
    } else {
      setExpandedYear(null);
      setExpandedQuarters(new Set());
      setExpandedMonths(new Set());
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-4 w-full" data-testid="time-navigator">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Time Navigator</span>
      </div>

      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <Switch
          id="expand-all"
          checked={expandAll}
          onCheckedChange={handleExpandAllToggle}
        />
        <Label htmlFor="expand-all" className="text-sm text-muted-foreground cursor-pointer">
          Expand All
        </Label>
      </div>

      <div className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate transition-colors",
            isPeriodSelected(yearPeriod) && "bg-primary/10 text-primary"
          )}
          data-testid={`time-nav-year-${year}`}
        >
          <button
            onClick={() => setExpandedYear(expandedYear === year ? null : year)}
            className="p-0.5"
            data-testid={`toggle-year-${year}`}
          >
            {expandedYear === year ? (
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

        {expandedYear === year && (
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
                <div key={quarter.name}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors",
                      isPeriodSelected(quarterPeriod) && "bg-primary/10 text-primary"
                    )}
                    data-testid={`time-nav-quarter-${qIndex + 1}`}
                  >
                    <button
                      onClick={() => toggleQuarter(qIndex)}
                      className="p-0.5"
                      data-testid={`toggle-quarter-${qIndex + 1}`}
                    >
                      {expandedQuarters.has(qIndex) ? (
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

                  {expandedQuarters.has(qIndex) && (
                    <div className="ml-4 space-y-0.5">
                      {quarter.months.map((monthIndex) => {
                        const monthPeriod: TimePeriod = {
                          type: "month",
                          year,
                          quarter: qIndex + 1,
                          month: monthIndex + 1,
                          label: `${MONTHS[monthIndex]} ${year}`,
                          startDate: new Date(year, monthIndex, 1),
                          endDate: new Date(year, monthIndex + 1, 0),
                        };
                        const weeks = getWeeksInMonth(year, monthIndex);

                        return (
                          <div key={monthIndex}>
                            <div
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors",
                                isPeriodSelected(monthPeriod) && "bg-primary/10 text-primary"
                              )}
                              data-testid={`time-nav-month-${monthIndex + 1}`}
                            >
                              <button
                                onClick={() => toggleMonth(monthIndex)}
                                className="p-0.5"
                                data-testid={`toggle-month-${monthIndex + 1}`}
                              >
                                {expandedMonths.has(monthIndex) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                              <span
                                onClick={() => handleSelectPeriod(monthPeriod)}
                                className="flex-1 text-sm"
                              >
                                {MONTHS[monthIndex].substring(0, 3)}
                              </span>
                            </div>

                            {expandedMonths.has(monthIndex) && (
                              <div className="ml-4 space-y-0.5">
                                {weeks.map((weekData) => {
                                  const weekPeriod: TimePeriod = {
                                    type: "week",
                                    year,
                                    quarter: qIndex + 1,
                                    month: monthIndex + 1,
                                    week: weekData.week,
                                    label: `Week ${weekData.week}, ${MONTHS[monthIndex]} ${year}`,
                                    startDate: weekData.startDate,
                                    endDate: weekData.endDate,
                                  };

                                  return (
                                    <div
                                      key={weekData.week}
                                      onClick={() => handleSelectPeriod(weekPeriod)}
                                      className={cn(
                                        "px-2 py-1 rounded-md cursor-pointer hover-elevate transition-colors text-xs",
                                        isPeriodSelected(weekPeriod) && "bg-primary/10 text-primary"
                                      )}
                                      data-testid={`time-nav-week-${monthIndex + 1}-${weekData.week}`}
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

      {selectedPeriod && (
        <div className="mt-3 pt-2 border-t">
          <div className="text-xs text-muted-foreground">Selected:</div>
          <div className="text-sm font-medium text-primary">{selectedPeriod.label}</div>
          <button
            onClick={() => onSelectPeriod(null)}
            className="text-xs text-muted-foreground underline mt-1 hover:text-foreground"
            data-testid="clear-time-selection"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
