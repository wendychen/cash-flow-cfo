import { Fragment, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import {
  getSankeyBreadcrumb,
  getSankeyParentLevel,
  resolveSankeyDrill,
  type SankeyDrillLevel,
} from "@/lib/sankeyNavigation";
import { cn } from "@/lib/utils";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { Goal } from "@/types/goal";
import { FixedExpense } from "@/types/fixedExpense";
import { useCurrency } from "@/hooks/use-currency";
import { useI18n } from "@/i18n";
import { type TimePeriod } from "@/components/shared";
import { EXPENSE_CATEGORIES, FIXED_EXPENSE_CATEGORIES, ExpenseCategory, FixedExpenseCategory, migrateFixedExpenseCategory } from "@/types/expenseCategory";
import { computeSankeyIncomeSplit } from "@/lib/incomeBreakdown";

interface SankeyNode {
  id: string;
  name: string;
  color: string;
  value: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyFlowChartProps {
  expenses: Expense[];
  incomes: Income[];
  savings: Saving[];
  goals: Goal[];
  fixedExpenses: FixedExpense[];
  selectedPeriod?: TimePeriod | null;
}

const SankeyFlowChart = ({
  expenses,
  incomes,
  savings,
  goals,
  fixedExpenses,
  selectedPeriod,
}: SankeyFlowChartProps) => {
  const { format: formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [drillDownLevel, setDrillDownLevel] = useState<SankeyDrillLevel>("overview");

  const incomeSplit = useMemo(() => computeSankeyIncomeSplit(incomes), [incomes]);

  const sankeyData = useMemo<SankeyData>(() => {
    const nodeLabels = {
      income: t('sankey.nodes.income'),
      savings: t('sankey.nodes.savings'),
      goals: t('sankey.nodes.goals'),
      expenses: t('sankey.nodes.expenses'),
      directCash: t('sankey.nodes.directCash'),
      collections: t('sankey.nodes.collections'),
      accruedOutstanding: t('sankey.nodes.accruedOutstanding'),
      totalIncome: t('sankey.nodes.totalIncome'),
      balanceSnapshots: t('sankey.nodes.balanceSnapshots'),
      goalSavings: t('sankey.nodes.goalSavings'),
      totalSavings: t('sankey.nodes.totalSavings'),
      noBudgetedGoals: t('sankey.nodes.noBudgetedGoals'),
      totalExpenses: t('sankey.nodes.totalExpenses'),
      fixedExpenses: t('sankey.nodes.fixedExpenses'),
      onetimeExpenses: t('sankey.nodes.onetimeExpenses'),
    };

    const totalIncome = incomeSplit.total;
    const totalSavings = savings.filter(s => s.savingType === "balance").reduce((sum, sav) => sum + sav.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const activeGoals = goals.filter(g => !g.completed && g.title);

    const { directCash, collections, accruedOutstanding } = incomeSplit;

    const fixedExpenseTotal = fixedExpenses.filter(f => f.isActive).reduce((sum, exp) => sum + exp.amount, 0);
    const discretionaryExpenseTotal = totalExpenses - fixedExpenseTotal;

    const goalLinkedExpenses = expenses.filter(e => goals.some(g => g.linkedExpenseId === e.id));
    const goalExpenseTotal = goalLinkedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    if (drillDownLevel === "overview") {
      const totalGoalBudget = activeGoals.reduce((sum, g) => sum + (g.budget ?? 0), 0);
      const goalsNodeValue = Math.max(totalGoalBudget, goalExpenseTotal);

      nodes.push(
        { id: "income", name: nodeLabels.income, color: "#8b5cf6", value: totalIncome },
        { id: "savings", name: nodeLabels.savings, color: "#3b82f6", value: totalSavings },
        { id: "goals", name: nodeLabels.goals, color: "#f59e0b", value: goalsNodeValue },
        { id: "expenses", name: nodeLabels.expenses, color: "#ef4444", value: totalExpenses }
      );

      if (totalIncome > 0) {
        const incomeToSavings = Math.min(totalSavings, totalIncome);
        const incomeToExpenses = Math.max(0, totalIncome - incomeToSavings);

        if (incomeToSavings > 0) {
          links.push(
            { source: "income", target: "savings", value: incomeToSavings, color: "#3b82f680" }
          );
        }
        if (incomeToExpenses > 0) {
          links.push(
            { source: "income", target: "expenses", value: incomeToExpenses, color: "#ef444480" }
          );
        }
      }

      if (totalSavings > 0 && goalsNodeValue > 0) {
        const savingsToGoals = Math.min(totalSavings, goalsNodeValue);
        links.push(
          { source: "savings", target: "goals", value: savingsToGoals, color: "#f59e0b80" }
        );
      }

      if (goalExpenseTotal > 0) {
        links.push(
          { source: "goals", target: "expenses", value: goalExpenseTotal, color: "#ef444480" }
        );
      }
    } else if (drillDownLevel === "income-detail") {
      nodes.push(
        { id: "direct-cash", name: nodeLabels.directCash, color: "#8b5cf6", value: directCash },
        { id: "collections", name: nodeLabels.collections, color: "#14b8a6", value: collections },
        { id: "accrued-outstanding", name: nodeLabels.accruedOutstanding, color: "#a78bfa", value: accruedOutstanding },
        { id: "total-income", name: nodeLabels.totalIncome, color: "#7c3aed", value: totalIncome }
      );

      if (directCash > 0) {
        links.push({ source: "direct-cash", target: "total-income", value: directCash, color: "#8b5cf680" });
      }
      if (collections > 0) {
        links.push({ source: "collections", target: "total-income", value: collections, color: "#14b8a680" });
      }
      if (accruedOutstanding > 0) {
        links.push({
          source: "accrued-outstanding",
          target: "total-income",
          value: accruedOutstanding,
          color: "#a78bfa80",
        });
      }
    } else if (drillDownLevel === "savings-detail") {
      const balanceTotal = savings
        .filter((s) => s.savingType === "balance")
        .reduce((sum, s) => sum + s.amount, 0);
      const goalSavingsTotal = savings
        .filter((s) => s.savingType === "goal")
        .reduce((sum, s) => sum + s.amount, 0);
      const savingsTotal = balanceTotal + goalSavingsTotal;

      nodes.push(
        { id: "balance-savings", name: nodeLabels.balanceSnapshots, color: "#3b82f6", value: balanceTotal },
        { id: "goal-savings", name: nodeLabels.goalSavings, color: "#6366f1", value: goalSavingsTotal },
        { id: "total-savings", name: nodeLabels.totalSavings, color: "#2563eb", value: savingsTotal }
      );

      if (balanceTotal > 0) {
        links.push({
          source: "balance-savings",
          target: "total-savings",
          value: balanceTotal,
          color: "#3b82f680",
        });
      }
      if (goalSavingsTotal > 0) {
        links.push({
          source: "goal-savings",
          target: "total-savings",
          value: goalSavingsTotal,
          color: "#6366f180",
        });
      }
    } else if (drillDownLevel === "goal-detail") {
      const goalsNodeValue = activeGoals.reduce(
        (sum, g) => sum + (g.budget > 0 ? g.budget : 0),
        0
      );
      nodes.push({ id: "savings", name: nodeLabels.savings, color: "#3b82f6", value: totalSavings });

      activeGoals.slice(0, 8).forEach((goal, idx) => {
        const linkedExpense = expenses.find((e) => e.id === goal.linkedExpenseId);
        const goalValue =
          goal.budget > 0 ? goal.budget : linkedExpense?.amount ?? 0;
        if (goalValue <= 0) return;

        nodes.push({
          id: `goal-${goal.id}`,
          name: goal.title.substring(0, 24),
          color: `hsl(${45 + idx * 25}, 85%, 55%)`,
          value: goalValue,
        });

        links.push({
          source: "savings",
          target: `goal-${goal.id}`,
          value: Math.min(goalValue, totalSavings || goalValue),
          color: `hsl(${45 + idx * 25}, 85%, 55%, 0.5)`,
        });
      });

      if (nodes.length === 1 && goalsNodeValue === 0) {
        nodes.push({
          id: "no-goals",
          name: nodeLabels.noBudgetedGoals,
          color: "#d97706",
          value: 1,
        });
      }
    } else if (drillDownLevel === "expense-detail") {
      const oneTimeExpenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      nodes.push(
        { id: "expenses", name: nodeLabels.totalExpenses, color: "#ef4444", value: totalExpenses },
        { id: "fixed", name: nodeLabels.fixedExpenses, color: "#dc2626", value: fixedExpenseTotal },
        { id: "onetime", name: nodeLabels.onetimeExpenses, color: "#f87171", value: oneTimeExpenseTotal }
      );

      if (fixedExpenseTotal > 0) {
        links.push({ source: "expenses", target: "fixed", value: fixedExpenseTotal, color: "#dc262680" });
      }
      if (oneTimeExpenseTotal > 0) {
        links.push({ source: "expenses", target: "onetime", value: oneTimeExpenseTotal, color: "#f8717180" });
      }
    } else if (drillDownLevel === "expense-categories-split") {
      const splitOneTimeTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      nodes.push(
        { id: "fixed-expenses", name: nodeLabels.fixedExpenses, color: "#dc2626", value: fixedExpenseTotal },
        { id: "onetime-expenses", name: nodeLabels.onetimeExpenses, color: "#f87171", value: splitOneTimeTotal }
      );

      const fixedCategoryKeys: FixedExpenseCategory[] = [
        "housing", "utilities-water-electric", "utilities-gas", "utilities-telecom",
        "transport", "health", "liabilities-debt", "liabilities-loans", "liabilities-installments", "taxes",
      ];
      const fixedCategoryTotals: Record<string, number> = Object.fromEntries(fixedCategoryKeys.map((k) => [k, 0]));
      const fixedColorMap: Record<string, string> = {
        housing: "#dc2626",
        "utilities-water-electric": "#eab308",
        "utilities-gas": "#f59e0b",
        "utilities-telecom": "#84cc16",
        transport: "#2563eb",
        health: "#16a34a",
        "liabilities-debt": "#f97316",
        "liabilities-loans": "#ea580c",
        "liabilities-installments": "#c2410c",
        taxes: "#6b7280",
      };

      fixedExpenses.filter((f) => f.isActive).forEach((expense) => {
        const category = migrateFixedExpenseCategory(expense.category);
        if (fixedCategoryTotals[category] !== undefined) {
          fixedCategoryTotals[category] += expense.amount;
        } else {
          fixedCategoryTotals.housing += expense.amount;
        }
      });

      Object.entries(fixedCategoryTotals).forEach(([category, total]) => {
        if (total > 0) {
          const cat = category as FixedExpenseCategory;
          const meta = FIXED_EXPENSE_CATEGORIES[cat];
          const color = fixedColorMap[category] ?? "#6b7280";
          nodes.push({
            id: `fixed-cat-${category}`,
            name: meta?.label ?? category,
            color,
            value: total,
          });
          links.push({
            source: "fixed-expenses",
            target: `fixed-cat-${category}`,
            value: total,
            color: color + "80",
          });
        }
      });

      const expenseCategoryKeys: ExpenseCategory[] = ["food", "necessities", "lifestyle", "family", "misc", "opex", "capex", "gna"];
      const onetimeCategoryTotals: Record<string, number> = Object.fromEntries(expenseCategoryKeys.map((k) => [k, 0]));

      expenses.forEach((expense) => {
        const category = (expenseCategoryKeys.includes(expense.category as ExpenseCategory) ? expense.category : "misc") as ExpenseCategory;
        onetimeCategoryTotals[category] += expense.amount;
      });

      Object.entries(onetimeCategoryTotals).forEach(([category, total]) => {
        if (total > 0) {
          const cat = category as ExpenseCategory;
          const meta = EXPENSE_CATEGORIES[cat];
          const colorMap: Record<ExpenseCategory, string> = {
            food: "#10b981",
            necessities: "#14b8a6",
            lifestyle: "#ec4899",
            family: "#06b6d4",
            misc: "#64748b",
            opex: "#3b82f6",
            capex: "#8b5cf6",
            gna: "#f97316",
          };
          nodes.push({
            id: `onetime-cat-${category}`,
            name: meta.label,
            color: colorMap[cat],
            value: total,
          });
          links.push({
            source: "onetime-expenses",
            target: `onetime-cat-${category}`,
            value: total,
            color: colorMap[cat] + "80",
          });
        }
      });
    } else if (drillDownLevel === "fixed-expense-categories") {
      nodes.push({ id: "fixed-expenses", name: nodeLabels.fixedExpenses, color: "#dc2626", value: fixedExpenseTotal });

      const fixedCategoryKeys: FixedExpenseCategory[] = [
        "housing", "utilities-water-electric", "utilities-gas", "utilities-telecom",
        "transport", "health", "liabilities-debt", "liabilities-loans", "liabilities-installments", "taxes",
      ];
      const categoryTotals: Record<string, number> = Object.fromEntries(fixedCategoryKeys.map((k) => [k, 0]));
      const colorMap: Record<string, string> = {
        housing: "#dc2626",
        "utilities-water-electric": "#eab308",
        "utilities-gas": "#f59e0b",
        "utilities-telecom": "#84cc16",
        transport: "#2563eb",
        health: "#16a34a",
        "liabilities-debt": "#f97316",
        "liabilities-loans": "#ea580c",
        "liabilities-installments": "#c2410c",
        taxes: "#6b7280",
      };

      fixedExpenses.filter(f => f.isActive).forEach((expense) => {
        const category = migrateFixedExpenseCategory(expense.category);
        if (categoryTotals[category] !== undefined) {
          categoryTotals[category] += expense.amount;
        } else {
          categoryTotals.housing += expense.amount;
        }
      });

      Object.entries(categoryTotals).forEach(([category, total]) => {
        if (total > 0) {
          const cat = category as FixedExpenseCategory;
          const meta = FIXED_EXPENSE_CATEGORIES[cat];
          const color = colorMap[category] ?? "#6b7280";

          nodes.push({
            id: `fixed-cat-${category}`,
            name: meta?.label ?? category,
            color,
            value: total,
          });

          links.push({
            source: "fixed-expenses",
            target: `fixed-cat-${category}`,
            value: total,
            color: color + "80",
          });
        }
      });
    } else if (drillDownLevel === "onetime-expense-categories") {
      const oneTimeExpenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      nodes.push({ id: "onetime-expenses", name: nodeLabels.onetimeExpenses, color: "#f87171", value: oneTimeExpenseTotal });

      const expenseCategoryKeys: ExpenseCategory[] = ["food", "necessities", "lifestyle", "family", "misc", "opex", "capex", "gna"];
      const categoryTotals: Record<string, number> = Object.fromEntries(expenseCategoryKeys.map((k) => [k, 0]));

      expenses.forEach((expense) => {
        const category = (expenseCategoryKeys.includes(expense.category as ExpenseCategory) ? expense.category : "misc") as ExpenseCategory;
        categoryTotals[category] += expense.amount;
      });

      Object.entries(categoryTotals).forEach(([category, total]) => {
        if (total > 0) {
          const cat = category as ExpenseCategory;
          const meta = EXPENSE_CATEGORIES[cat];
          const colorMap: Record<ExpenseCategory, string> = {
            food: "#10b981",
            necessities: "#14b8a6",
            lifestyle: "#ec4899",
            family: "#06b6d4",
            misc: "#64748b",
            opex: "#3b82f6",
            capex: "#8b5cf6",
            gna: "#f97316",
          };

          nodes.push({
            id: `onetime-cat-${category}`,
            name: meta.label,
            color: colorMap[cat],
            value: total,
          });

          links.push({
            source: "onetime-expenses",
            target: `onetime-cat-${category}`,
            value: total,
            color: colorMap[cat] + "80",
          });
        }
      });
    }

    return { nodes, links };
  }, [drillDownLevel, incomeSplit, expenses, savings, goals, fixedExpenses, t]);

  const handleNodeClick = (nodeId: string) => {
    const next = resolveSankeyDrill(drillDownLevel, nodeId);
    if (next) {
      setDrillDownLevel(next);
    }
  };

  const handleBack = () => {
    setDrillDownLevel(getSankeyParentLevel(drillDownLevel));
  };

  const handleBreadcrumbNavigate = (level: SankeyDrillLevel) => {
    if (level !== drillDownLevel) {
      setDrillDownLevel(level);
    }
  };

  const breadcrumb = getSankeyBreadcrumb(drillDownLevel);

  return (
    <Card className="w-full">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {drillDownLevel !== "overview" && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {t('sankey.title')}
            </CardTitle>
            <CardDescription>
              {drillDownLevel === "overview" && t('sankey.hints.overview')}
              {drillDownLevel === "income-detail" && t('sankey.hints.incomeDetail')}
              {drillDownLevel === "savings-detail" && t('sankey.hints.savingsDetail')}
              {drillDownLevel === "goal-detail" && t('sankey.hints.goalDetail')}
              {drillDownLevel === "expense-detail" && t('sankey.hints.expenseDetail')}
              {drillDownLevel === "expense-categories-split" && t('sankey.hints.categoriesSplit')}
              {drillDownLevel === "fixed-expense-categories" && t('sankey.hints.fixedCategories')}
              {drillDownLevel === "onetime-expense-categories" && t('sankey.hints.onetimeCategories')}
            </CardDescription>
          </div>
        </div>

        {breadcrumb.length > 1 && (
          <div
            className="mt-4 flex items-center gap-1 overflow-x-auto pb-1"
            role="navigation"
            aria-label={t('sankey.timeline')}
          >
            {breadcrumb.map((step, index) => (
              <Fragment key={step.level}>
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbNavigate(step.level)}
                  disabled={step.level === drillDownLevel}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs transition-colors",
                    step.level === drillDownLevel
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {t(step.labelKey)}
                </button>
              </Fragment>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <div className="space-y-6">
          <SankeyVisualization
            data={sankeyData}
            onNodeClick={handleNodeClick}
            formatCurrency={formatCurrency}
            drillDownLevel={drillDownLevel}
            diagramAriaLabel={t('sankey.ariaDiagram')}
          />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
            <div className="min-w-0 overflow-hidden px-4 py-3 bg-violet-50 dark:bg-violet-950 rounded-lg border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium">{t('summary.totalIncome')}</span>
              </div>
              <div className="text-sm font-semibold tabular-nums leading-snug break-all text-violet-700 dark:text-violet-300">
                {formatCurrency(incomeSplit.total)}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden px-4 py-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1.5">
                <span className="text-xs font-medium">{t('summary.savings')}</span>
              </div>
              <div className="text-sm font-semibold tabular-nums leading-snug break-all text-blue-700 dark:text-blue-300">
                {formatCurrency(savings.filter(s => s.savingType === "balance").reduce((s, sav) => s + sav.amount, 0))}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden px-4 py-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1.5">
                <span className="text-xs font-medium">{t('summary.activeGoals')}</span>
              </div>
              <div className="text-sm font-semibold tabular-nums leading-snug text-amber-700 dark:text-amber-300">
                {goals.filter(g => !g.completed && g.title).length}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden px-4 py-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 mb-1.5">
                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium">{t('summary.totalExpenses')}</span>
              </div>
              <div className="text-sm font-semibold tabular-nums leading-snug break-all text-red-700 dark:text-red-300">
                {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface SankeyVisualizationProps {
  data: SankeyData;
  onNodeClick: (nodeId: string) => void;
  formatCurrency: (amount: number) => string;
  drillDownLevel: SankeyDrillLevel;
  diagramAriaLabel: string;
}

const SankeyVisualization = ({ 
  data, 
  onNodeClick, 
  formatCurrency,
  drillDownLevel,
  diagramAriaLabel,
}: SankeyVisualizationProps) => {
  const svgWidth = 800;
  const svgHeight = drillDownLevel === "expense-categories-split" ? 520 : 400;
  const nodeWidth = 20;
  const nodePadding = 30;

  const { nodes, links } = data;

  const maxValue = Math.max(...nodes.map(n => n.value), 1);

  const OVERVIEW_COLUMN: Record<string, number> = {
    income: 0,
    savings: 1,
    goals: 2,
    expenses: 3,
  };

  const columns: { [key: number]: SankeyNode[] } = {};
  nodes.forEach((node, idx) => {
    const col = drillDownLevel === "overview" && OVERVIEW_COLUMN[node.id] !== undefined
      ? OVERVIEW_COLUMN[node.id]
      : idx % 3;
    if (!columns[col]) columns[col] = [];
    columns[col].push(node);
  });

  const columnCount = Math.max(...Object.keys(columns).map(Number), 0) + 1;
  const columnWidth = svgWidth / (columnCount + 1);

  const isSplitCategoryView = drillDownLevel === "expense-categories-split";
  const isCategoryView =
    drillDownLevel === "fixed-expense-categories" ||
    drillDownLevel === "onetime-expense-categories";
  const isDetailView = drillDownLevel !== "overview";

  const splitLane = (nodeId: string): 1 | 2 =>
    nodeId.startsWith("onetime") ? 2 : 1;

  const positionedNodes = nodes.map((node, idx) => {
    let col: number;
    let rowIdx: number;
    let totalInCol: number;

    if (isSplitCategoryView) {
      const lane = splitLane(node.id);
      const lanePrefix = lane === 2 ? "onetime" : "fixed";
      const laneNodes = nodes.filter((n) => n.id.startsWith(lanePrefix));
      const laneCategories = laneNodes.filter(
        (n) => n.id !== `${lanePrefix}-expenses`
      );
      const isLaneSource = node.id === `${lanePrefix}-expenses`;

      col = lane;
      totalInCol = laneCategories.length + 1;
      rowIdx = isLaneSource ? 0 : laneCategories.indexOf(node) + 1;
    } else if (isDetailView) {
      const isSource = links.some((link) => link.source === node.id);
      const targetNodes = nodes.filter((n) =>
        links.some((link) => link.target === n.id)
      );

      if (isSource) {
        const sourceNodes = nodes.filter((n) => links.some((link) => link.source === n.id));
        col = 0;
        rowIdx = sourceNodes.indexOf(node);
        totalInCol = sourceNodes.length;
      } else {
        col = isCategoryView ? 3 : 2;
        rowIdx = targetNodes.indexOf(node);
        totalInCol = targetNodes.length;
      }
    } else {
      col = OVERVIEW_COLUMN[node.id] ?? idx % 3;
      rowIdx = columns[col].indexOf(node);
      totalInCol = columns[col].length;
    }

    const x = (col + 1) * columnWidth - nodeWidth / 2;
    const nodeHeight = Math.max(40, (node.value / maxValue) * 200);
    const totalHeight = totalInCol * nodeHeight + (totalInCol - 1) * nodePadding;
    const startY = (svgHeight - totalHeight) / 2;
    const y = startY + rowIdx * (nodeHeight + nodePadding);

    return {
      ...node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
    };
  });

  const getLinkPath = (link: SankeyLink) => {
    const source = positionedNodes.find(n => n.id === link.source);
    const target = positionedNodes.find(n => n.id === link.target);

    if (!source || !target) return "";

    const sourceX = source.x + source.width;
    const sourceY = source.y + source.height / 2;
    const targetX = target.x;
    const targetY = target.y + target.height / 2;

    const midX = (sourceX + targetX) / 2;

    return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  };

  return (
    <div className="w-full flex justify-center px-2 py-4">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        aria-label={diagramAriaLabel}
      >
        <defs>
          {links.map((link, idx) => (
            <linearGradient key={idx} id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={link.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={link.color} stopOpacity="0.3" />
            </linearGradient>
          ))}
        </defs>

        {links.map((link, idx) => {
          const linkHeight = (link.value / maxValue) * 20;
          return (
            <path
              key={idx}
              d={getLinkPath(link)}
              fill="none"
              stroke={`url(#gradient-${idx})`}
              strokeWidth={linkHeight}
              opacity="0.6"
            />
          );
        })}

        {positionedNodes.map((node) => (
          <g key={node.id} onClick={() => onNodeClick(node.id)} className="cursor-pointer">
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill={node.color}
              rx="4"
              className="transition-all hover:opacity-80"
            />
            <text
              x={node.x + node.width + 8}
              y={node.y + node.height / 2}
              fontSize="12"
              fill="currentColor"
              dominantBaseline="middle"
              className="font-medium"
            >
              {node.name}
            </text>
            <text
              x={node.x + node.width + 8}
              y={node.y + node.height / 2 + 14}
              fontSize="10"
              fill="currentColor"
              opacity="0.7"
              dominantBaseline="middle"
            >
              {formatCurrency(node.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default SankeyFlowChart;
