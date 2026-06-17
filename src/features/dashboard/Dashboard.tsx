import { useState, useRef, useEffect } from "react";
import { useFinanceStore, reimportOldData } from "@/stores";
import { useFinance, useFinanceHydrated } from "@/stores";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Receipt, TrendingUp, PiggyBank, Target as GoalIcon, Download, Upload, Printer, CircleHelp } from "lucide-react";
import { saveFinanceExport, parseImportJSON } from "@/lib/exportImport";
import { saveFinanceCsvExport } from "@/lib/csvExport";
import { computeIncomeBreakdown } from "@/lib/incomeBreakdown";
import { getLatestAutoBackup, listAutoBackups } from "@/lib/autoBackup";
import { printBackupReport, printGoalsReport } from "@/lib/printReport";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { parseCsvToFinanceState } from "@/lib/csvImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Currency } from "@/hooks/use-currency";
import { TimeNavigator, UserGuide, type TimePeriod } from "@/components/shared";
import { hasSeenUserGuide } from "@/lib/onboarding";
import { GoalList, GoalBudgetAllocator } from "@/features/goals";
import { ExpenseForm, ExpenseList } from "@/features/expenses";
import { SavingForm, SavingList, FixedExpenseForm, FixedExpenseList } from "@/features/savings";
import { SankeyFlowChart, CombinedChart, CashFlowSimulator, MonthlySummary } from "@/features/charts";
import { useI18n, type Locale } from "@/i18n";
import {
  buildGoalExportPayload,
  downloadGoalExport,
  parseGoalImportJSON,
} from "@/lib/goalExport";
import { IncomeForm, IncomeList, IncomeBreakdownBar } from "@/features/income";
import type { TaskType } from "@/types/task";

/**
 * New clean Dashboard — the future home of the app.
 * Built with Zustand + normalized data model (v2).
 */
export default function Dashboard() {
  const {
    expenses,
    incomes,
    savings,
    fixedExpenses,
    targets,
    goals,
    tasks,
    addGoal,
    updateGoal,
    deleteGoal,
    addExpense,
    updateExpense,
    deleteExpense,
    addSaving,
    updateSaving,
    deleteSaving,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    setTarget,
    reorderGoals,
    toggleExpenseNeedsCheck,
    reorderTasks,
    moveTask,
    addTask,
    addIncome,
    updateIncome,
    deleteIncome,
    recordAccruedCollection,
    updateTask,
    deleteTask,
    resetAllData,
    replaceAllData,
    backfillMissingShadowExpenses,
    importGoalBundle,
    spawnRepeatingGoalCycle,
  } = useFinanceStore();

  const { format, currency, setCurrency } = useCurrency();
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    backfillMissingShadowExpenses();
  }, [backfillMissingShadowExpenses]);

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | null>(null);
  const [activeTab, setActiveTab] = useState("income");
  const [userGuideOpen, setUserGuideOpen] = useState(false);
  const isStoreHydrated = useFinanceHydrated();

  useEffect(() => {
    if (isStoreHydrated && !hasSeenUserGuide()) {
      setUserGuideOpen(true);
    }
  }, [isStoreHydrated]);
  useAutoBackup(isStoreHydrated);

  const latestAutoBackup = getLatestAutoBackup();

  // Ref for hidden file input (import)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goalImportRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const stateSnapshot = {
      version: 2 as const,
      expenses,
      incomes,
      savings,
      fixedExpenses,
      targets,
      goals,
      tasks,
    };
    const result = await saveFinanceExport(stateSnapshot);
    if (!result.success) {
      if (result.method !== 'cancelled') {
        alert(`❌ ${t('dashboard.exportFailed')}`);
      }
      return;
    }
    const methodNote =
      result.method === 'picker'
        ? t('dashboard.savedToChosen')
        : t('dashboard.downloadedDefault');
    alert(`✅ ${t('dashboard.exported', { filename: result.filename, method: methodNote })}`);
  };

  const handleCsvExport = async () => {
    const stateSnapshot = {
      version: 2 as const,
      expenses,
      incomes,
      savings,
      fixedExpenses,
      targets,
      goals,
      tasks,
    };
    const result = await saveFinanceCsvExport(stateSnapshot);
    if (!result.success) {
      if (result.error) {
        alert(`❌ ${result.error}`);
      } else if (result.method !== 'cancelled') {
        alert(`❌ ${t('dashboard.csvExportFailed')}`);
      }
      return;
    }
    const methodNote =
      result.method === 'picker'
        ? t('dashboard.savedToChosen')
        : t('dashboard.downloadedDefault');
    alert(`✅ ${t('dashboard.exported', { filename: result.filename, method: methodNote })}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const isCsv = file.name.toLowerCase().endsWith('.csv');

      const result = isCsv
        ? parseCsvToFinanceState(text)
        : parseImportJSON(text);

      if (!result.success || !result.data) {
        alert(`❌ ${t('dashboard.importFailed', { error: result.error || 'Unknown error' })}`);
        return;
      }

      const counts = isCsv
        ? (result as ReturnType<typeof parseCsvToFinanceState>).counts
        : (result as ReturnType<typeof parseImportJSON>).meta?.counts;

      const recordCount = counts
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : 'unknown';

      const sourceLabel = isCsv ? 'CSV' : 'JSON';

      if (
        confirm(
          t('dashboard.importConfirm', {
            source: sourceLabel,
            count: String(recordCount),
          })
        )
      ) {
        replaceAllData(result.data);
        backfillMissingShadowExpenses();
        alert(`✅ ${t('dashboard.importSuccess', { source: sourceLabel })}`);
      }
    };
    reader.readAsText(file);

    // Allow re-selecting the same file later
    event.target.value = '';
  };

  // Clean usage via the new useFinance hook (pass selectedPeriod for automatic filtering)
  const {
    filteredExpenses,
    filteredIncomes,
    filteredSavings,
    filteredFixedExpenses,
    filteredGoals,
    latestSavingsBalance,
    dashboardSummary,
    activeGoals,
  } = useFinance(selectedPeriod);

  // Goals tab: always show all active goals (period filter must not hide goals when deadline moves)
  const goalsForManagement = activeGoals;
  const tasksForManagement = tasks.filter((t) =>
    goalsForManagement.some((g) => g.id === t.goalId)
  );

  const { totalIncome, totalExpenses, totalSavings } = dashboardSummary;
  const incomeBreakdown = computeIncomeBreakdown(filteredIncomes);

  const periodDays = selectedPeriod
    ? Math.max(
        1,
        Math.ceil(
          (selectedPeriod.endDate.getTime() - selectedPeriod.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      )
    : 30;
  const monthlyIncome = (totalIncome / periodDays) * 30;
  const monthlyExpenses = (totalExpenses / periodDays) * 30;

  const handleExportGoal = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    downloadGoalExport(buildGoalExportPayload(goal, tasks));
  };

  const handleGoalImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseGoalImportJSON(text);
      if (!result.success || !result.payload) {
        alert(t('goals.importFailed', { error: result.error ?? 'Unknown error' }));
        return;
      }
      importGoalBundle({
        goal: result.payload.goal,
        tasks: result.payload.tasks,
      });
      alert(t('goals.importSuccess'));
    };
    reader.readAsText(file);
    event.target.value = '';
  };





  // Adapters for real GoalList component
  const handleAddGoalFromList = (title: string, deadline: string) => {
    addGoal({
      title,
      deadline,
      completed: false,
      isMagicWand: false,
      category: "food",
      budget: 0,
      timeCost: "",
      ideations: [],
      constraint: "",
      urlPack: [],
    });
  };

  const handleAddTask = (
    goalId: string,
    parentId: string | null,
    taskType: TaskType,
    data: { title: string; cost: number; timeCost: string; deadline: string }
  ) => {
    addTask({
      goalId,
      parentId,
      taskType,
      title: data.title,
      cost: data.cost,
      timeCost: data.timeCost,
      deadline: data.deadline,
      isMagicWand: false,
      completed: false,
    });
  };

  const handleUpdateTask = (taskId: string, updates: any) => {
    updateTask(taskId, updates);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleReorderTasks = (reordered: any[]) => {
    if (reordered.length === 0) return;
    const { goalId, taskType } = reordered[0];
    const orderedIds = reordered.map((t: any) => t.id);
    reorderTasks(goalId, taskType, orderedIds);
  };

  // Expense handlers for real components
  const handleToggleNeedsCheck = (id: string) => {
    toggleExpenseNeedsCheck(id);
  };

  const handleAddSaving = (saving: Parameters<typeof addSaving>[0]) => {
    addSaving(saving, currency);
  };

  const handleUpdateSaving = (
    id: string,
    updates: Parameters<typeof updateSaving>[1]
  ) => {
    updateSaving(id, updates, currency);
  };

  const handlePrintGoals = () => {
    printGoalsReport({
      goals,
      tasks,
      formatAmount: format,
      displayCurrency: currency,
    });
  };

  const handlePrintBackup = () => {
    printBackupReport(
      {
        backups: listAutoBackups(),
        currentState: {
          version: 2,
          expenses,
          incomes,
          savings,
          fixedExpenses,
          targets,
          goals,
          tasks,
        },
      },
      { formatAmount: format }
    );
  };

  const handleUpdateTarget = (
    type: Parameters<typeof setTarget>[0],
    amount: number,
    period: Parameters<typeof setTarget>[2],
    targetCurrency: Parameters<typeof setTarget>[3]
  ) => {
    setTarget(type, amount, period, targetCurrency);
  };

  return (
    <>
    <UserGuide open={userGuideOpen} onOpenChange={setUserGuideOpen} />
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{t('app.title')}</h1>
            <p className="text-muted-foreground">{t('app.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserGuideOpen(true)}
              aria-label="Open user guide"
            >
              <CircleHelp className="mr-2 h-4 w-4" />
              {t('nav.guide')}
            </Button>
            <Select value={locale} onValueChange={(val) => setLocale(val as Locale)}>
              <SelectTrigger className="w-[120px]" aria-label={t('language.label')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('language.en')}</SelectItem>
                <SelectItem value="zh-TW">{t('language.zh')}</SelectItem>
                <SelectItem value="ja">{t('language.ja')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currency} onValueChange={(val) => setCurrency(val as Currency)}>
              <SelectTrigger className="w-[110px]" aria-label={t('nav.displayCurrency')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="NTD">NTD (NT$)</SelectItem>
                <SelectItem value="CAD">CAD (CA$)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('nav.exportJson')}
            </Button>
            <Button variant="outline" onClick={handleCsvExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('nav.exportCsv')}
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              {t('nav.importData')}
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('nav.reload')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (confirm(t('dashboard.resetConfirm'))) {
                  resetAllData();
                }
              }}
            >
              {t('nav.reset')}
            </Button>
            {/* Hidden file input for JSON import */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/json,.json,text/csv,.csv"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {/* Main Layout: Time Navigator on left + Content on right (original layout style) */}
        <div className="flex gap-8">
          {/* Left Sidebar - Time Navigator */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <Card>
                <CardContent className="p-4">
                  <TimeNavigator
                    selectedPeriod={selectedPeriod}
                    onSelectPeriod={setSelectedPeriod}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right - Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Summary Cards — auto-fit avoids clipping long currency values beside the sidebar */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.totalIncome')}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 space-y-1">
              <div className="text-sm font-semibold tabular-nums leading-snug break-all text-emerald-600">
                {format(totalIncome)}
              </div>
              {incomeBreakdown.total > 0 && (
                <div className="text-[11px] text-muted-foreground tabular-nums leading-snug">
                  {t('summary.cashReceived')}: {format(incomeBreakdown.cash)} · {t('summary.accruedIncome')}: {format(incomeBreakdown.accrued)}
                  {incomeBreakdown.collected > 0 && (
                    <> · {t('income.breakdown.collected')}: {format(incomeBreakdown.collected)}</>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {[
            { label: t('summary.totalExpenses'), value: format(totalExpenses), className: 'text-red-600' },
            { label: t('summary.savings'), value: format(totalSavings), className: 'text-blue-600' },
          ].map((stat) => (
            <Card key={stat.label} className="min-w-0 overflow-hidden">
              <CardHeader className="px-5 pt-5 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div
                  className={`text-sm font-semibold tabular-nums leading-snug break-all ${stat.className}`}
                >
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.activeGoals')}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <div className="text-sm font-semibold tabular-nums leading-snug">
                {activeGoals.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t('summary.totalTasks', { count: tasks.length })}</div>
            </CardContent>
          </Card>
        </div>

        <MonthlySummary
          expenses={expenses}
          incomes={incomes}
          savings={savings}
          fixedExpenses={fixedExpenses}
        />

        {/* Tabs Section - Original UI Style with Time Period Filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income">{t('tabs.income')}</TabsTrigger>
            <TabsTrigger value="expenses">{t('tabs.expenses')}</TabsTrigger>
            <TabsTrigger value="savings">{t('tabs.savings')}</TabsTrigger>
            <TabsTrigger value="goals">{t('tabs.goals')}</TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('tabs.income')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <IncomeBreakdownBar incomes={filteredIncomes} />
                <IncomeForm onAddIncome={addIncome} />
                <IncomeList
                  incomes={filteredIncomes}
                  allIncomes={incomes}
                  onDeleteIncome={deleteIncome}
                  onUpdateIncome={updateIncome}
                  onDuplicateIncome={addIncome}
                  onRecordCollection={recordAccruedCollection}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab (includes Fixed Expenses) */}
          <TabsContent value="expenses" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {t('tabs.expenses')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ExpenseForm onAddExpense={addExpense} />
                <ExpenseList
                  key={selectedPeriod ? `expenses-${selectedPeriod.label}` : "expenses-all"}
                  expenses={isStoreHydrated ? filteredExpenses : []}
                  onDeleteExpense={deleteExpense}
                  onToggleNeedsCheck={handleToggleNeedsCheck}
                  onUpdateExpense={updateExpense}
                  onDuplicateExpense={addExpense}
                  goals={goals}
                />
              </CardContent>
            </Card>

            {/* Fixed Expenses inside Expenses tab */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.fixedExpenses')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FixedExpenseForm onAddFixedExpense={addFixedExpense} />
                <FixedExpenseList
                  fixedExpenses={filteredFixedExpenses}
                  onUpdateFixedExpense={updateFixedExpense}
                  onDeleteFixedExpense={deleteFixedExpense}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Savings Tab */}
          <TabsContent value="savings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" />
                  {t('tabs.savings')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SavingForm onAddSaving={handleAddSaving} />
                <SavingList
                  savings={filteredSavings}
                  onDeleteSaving={deleteSaving}
                  onUpdateSaving={handleUpdateSaving}
                  onDuplicateSaving={(saving) => addSaving(saving, currency)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals & Tasks Tab */}
          <TabsContent value="goals" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <GoalIcon className="h-5 w-5" />
                  {t('tabs.goals')}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrintGoals}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t('dashboard.printGoals')}
                </Button>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={goalImportRef}
                  className="hidden"
                  accept="application/json,.json"
                  onChange={handleGoalImportFile}
                />
                <GoalList
                  goals={goalsForManagement}
                  allGoals={goalsForManagement}
                  tasks={tasksForManagement}
                  onUpdateGoal={updateGoal}
                  onAddGoal={handleAddGoalFromList}
                  onDeleteGoal={deleteGoal}
                  onExportGoal={handleExportGoal}
                  onImportGoal={() => goalImportRef.current?.click()}
                  onReorderGoals={(newGoals) => {
                    const orderedIds = newGoals.map(g => g.id);
                    reorderGoals(orderedIds);
                  }}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onReorderTasks={handleReorderTasks}
                  onMoveTask={moveTask}
                  onSpawnNextCycle={spawnRepeatingGoalCycle}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.goalBudgetAllocator')}</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalBudgetAllocator
                  goals={goalsForManagement}
                  tasks={tasksForManagement}
                  latestSavingsBalance={latestSavingsBalance}
                  onUpdateGoal={updateGoal}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Charts Section — Always visible below tabs, reacts to left Time Navigator */}
        <div className="pt-4 border-t mt-2">
          <div className="mb-3">
            <h2 className="text-xl font-semibold tracking-tight">{t('charts.visualizations')}</h2>
            <p className="text-sm text-muted-foreground">{t('charts.visualizationsHint')}</p>
          </div>

          <div className="space-y-6">
            <SankeyFlowChart
              expenses={filteredExpenses}
              incomes={filteredIncomes}
              savings={filteredSavings}
              goals={filteredGoals}
              fixedExpenses={filteredFixedExpenses}
              selectedPeriod={selectedPeriod}
            />

            <CashFlowSimulator
              monthlyIncome={monthlyIncome}
              monthlyExpenses={monthlyExpenses}
              currentSavings={latestSavingsBalance}
            />

            <Card>
              <CardHeader>
                <CardTitle>{t('charts.overview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CombinedChart
                  expenses={filteredExpenses}
                  incomes={filteredIncomes}
                  savings={filteredSavings}
                  targets={targets}
                  onUpdateTarget={handleUpdateTarget}
                  selectedPeriod={selectedPeriod}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status + Migration Controls */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.dataPortability')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1 text-muted-foreground">
              <p>✅ Full rich <strong>GoalList</strong> + task management</p>
              <p>✅ Full <strong>ExpenseForm</strong> + <strong>ExpenseList</strong></p>
              <p>✅ <strong>Savings</strong> + <strong>Fixed Expenses</strong> sections</p>
              <p>✅ <strong>GoalBudgetAllocator</strong> integrated</p>
              <p>✅ <strong>Charts</strong> (Sankey + Combined)</p>
              <p>✅ TimeNavigator + period filtering</p>
              <p>✅ All data through clean Zustand store (normalized v2 + rich selectors)</p>
              <p>✅ Custom `useFinance` hook + individual selectors available</p>
              <p>✅ Feature-based folder structure (Phase D in progress)</p>
              <p>✅ Shared components moved to `components/shared/`</p>
              <p>✅ Barrel export created for `components/shared/`</p>
              <p>✅ Archive moved to top-level `src/archive/`</p>
              <p>✅ README.md documentation added to all feature folders</p>
              <p>✅ Domain hook (use-task-tree) moved into features/goals/hooks/</p>
              <p>✅ <strong>New: Export / Import full data as JSON</strong> (backup, transfer, restore)</p>
            </div>

            <div className="pt-2 border-t space-y-3">
              {latestAutoBackup && (
                <div className="text-xs text-muted-foreground">
                  {t('dashboard.lastAutoBackup', {
                    date: new Date(latestAutoBackup.savedAt).toLocaleString(),
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintBackup}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t('dashboard.printBackup')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!latestAutoBackup}
                  onClick={() => {
                    if (!latestAutoBackup) return;
                    if (
                      confirm(
                        t('dashboard.restoreConfirm', {
                          date: new Date(latestAutoBackup.savedAt).toLocaleString(),
                        })
                      )
                    ) {
                      replaceAllData(latestAutoBackup.data);
                      backfillMissingShadowExpenses();
                      alert(`✅ ${t('dashboard.restoreSuccess')}`);
                    }
                  }}
                >
                  {t('dashboard.restoreBackup')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const result = reimportOldData();
                    alert(result.message);
                    if (result.success) {
                      window.location.reload();
                    }
                  }}
                >
                  {t('dashboard.reimportOld')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.backupHint')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>
    </>
  );
}

