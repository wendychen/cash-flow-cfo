import { useState, useRef, useEffect } from "react";
import { useFinanceStore, reimportOldData } from "@/stores";
import { useFinance } from "@/stores";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Receipt, TrendingUp, PiggyBank, Target as GoalIcon, Download, Upload } from "lucide-react";
import { exportFinanceData, parseImportJSON } from "@/lib/exportImport";
import { parseCsvToFinanceState } from "@/lib/csvImport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeNavigator, type TimePeriod } from "@/components/shared";
import { GoalList, GoalBudgetAllocator } from "@/features/goals";
import { ExpenseForm, ExpenseList } from "@/features/expenses";
import { SavingForm, SavingList, FixedExpenseForm, FixedExpenseList } from "@/features/savings";
import { SankeyFlowChart, CombinedChart } from "@/features/charts";
import { IncomeForm, IncomeList } from "@/features/income";
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
    updateTask,
    deleteTask,
    resetAllData,
    replaceAllData,
    backfillMissingShadowExpenses,
  } = useFinanceStore();

  const { format, currency } = useCurrency();

  useEffect(() => {
    backfillMissingShadowExpenses();
  }, [backfillMissingShadowExpenses]);

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | null>(null);

  // Period filtering helper (still needed for some calculations)
  const isInPeriod = (dateStr?: string) => {
    if (!selectedPeriod || !dateStr) return true;
    const d = new Date(dateStr);
    return d >= selectedPeriod.startDate && d <= selectedPeriod.endDate;
  };

  // Ref for hidden file input (import)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
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
    const result = exportFinanceData(stateSnapshot);
    alert(`✅ Exported to ${result.filename}`);
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
        alert(`❌ Import failed: ${result.error || 'Unknown error'}`);
        return;
      }

      const counts = isCsv
        ? (result as ReturnType<typeof parseCsvToFinanceState>).counts
        : (result as ReturnType<typeof parseImportJSON>).meta?.counts;

      const recordCount = counts
        ? Object.values(counts).reduce((a, b) => a + b, 0)
        : 'unknown';

      const sourceLabel = isCsv ? 'CSV' : 'JSON';

      if (confirm(`Import will REPLACE ALL current data.\n\n${sourceLabel} file contains ~${recordCount} records.\n\nThis cannot be undone. Continue?`)) {
        replaceAllData(result.data);
        backfillMissingShadowExpenses();
        alert(`✅ ${sourceLabel} imported successfully!`);
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

  // For Goals & Tasks tab we also want the tasks of the filtered goals
  const filteredTasks = tasks.filter(t => 
    filteredGoals.some(g => g.id === t.goalId) || (selectedPeriod ? isInPeriod(t.deadline) : true)
  );

  const { totalIncome, totalExpenses, totalSavings } = dashboardSummary;





  // Adapters for real GoalList component
  const handleAddGoalFromList = (title: string, deadline: string) => {
    addGoal({
      title,
      deadline,
      completed: false,
      isMagicWand: false,
      category: "misc",
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

  const handleUpdateTarget = (
    type: Parameters<typeof setTarget>[0],
    amount: number,
    period: Parameters<typeof setTarget>[2],
    targetCurrency: Parameters<typeof setTarget>[3]
  ) => {
    setTarget(type, amount, period, targetCurrency);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Cash Flow CFO</h1>
            <p className="text-muted-foreground">Personal cash flow and goal planning</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Import JSON/CSV
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (confirm("Reset all data? This cannot be undone.")) {
                  resetAllData();
                }
              }}
            >
              Reset All Data
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
            {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader><CardTitle>Total Income</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{format(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{format(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Savings</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{format(totalSavings)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Active Goals</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeGoals.length}</div>
              <div className="text-sm text-muted-foreground">{tasks.length} total tasks</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section - Original UI Style with Time Period Filtering */}
        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="goals">Goals &amp; Tasks</TabsTrigger>
          </TabsList>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <IncomeForm onAddIncome={addIncome} />
                <IncomeList incomes={filteredIncomes} onDeleteIncome={deleteIncome} onUpdateIncome={updateIncome} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab (includes Fixed Expenses) */}
          <TabsContent value="expenses" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ExpenseForm onAddExpense={addExpense} />
                <ExpenseList
                  expenses={filteredExpenses}
                  onDeleteExpense={deleteExpense}
                  onToggleNeedsCheck={handleToggleNeedsCheck}
                  onUpdateExpense={updateExpense}
                  goals={goals}
                />
              </CardContent>
            </Card>

            {/* Fixed Expenses inside Expenses tab */}
            <Card>
              <CardHeader>
                <CardTitle>Fixed Expenses</CardTitle>
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
                  Savings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SavingForm onAddSaving={handleAddSaving} />
                <SavingList
                  savings={filteredSavings}
                  onDeleteSaving={deleteSaving}
                  onUpdateSaving={handleUpdateSaving}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals & Tasks Tab */}
          <TabsContent value="goals" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GoalIcon className="h-5 w-5" />
                  Goals &amp; Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GoalList
                  goals={filteredGoals}
                  allGoals={filteredGoals}
                  tasks={filteredTasks}
                  onUpdateGoal={updateGoal}
                  onAddGoal={handleAddGoalFromList}
                  onDeleteGoal={deleteGoal}
                  onReorderGoals={(newGoals) => {
                    const orderedIds = newGoals.map(g => g.id);
                    reorderGoals(orderedIds);
                  }}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onReorderTasks={handleReorderTasks}
                  onMoveTask={moveTask}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Budget Allocator</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalBudgetAllocator
                  goals={filteredGoals}
                  tasks={filteredTasks}
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
            <h2 className="text-xl font-semibold tracking-tight">Cash Flow Visualizations</h2>
            <p className="text-sm text-muted-foreground">Sankey and overview charts update automatically when you change the period on the left</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Sankey</CardTitle>
              </CardHeader>
              <CardContent>
                <SankeyFlowChart
                  expenses={filteredExpenses}
                  incomes={filteredIncomes}
                  savings={filteredSavings}
                  goals={filteredGoals}
                  fixedExpenses={filteredFixedExpenses}
                  selectedPeriod={selectedPeriod}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overview Charts (Summary)</CardTitle>
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
            <CardTitle>Architecture Status + Data Portability</CardTitle>
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

            <div className="pt-2 border-t">
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
                Re-import old data from localStorage
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Legacy: Use this if your old data didn't appear automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>
  );
}

