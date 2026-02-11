import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { Goal } from "@/types/goal";
import { FixedExpense } from "@/types/fixedExpense";
import { useCurrency } from "@/hooks/use-currency";
import { TimePeriod } from "./TimeNavigator";
import { EXPENSE_CATEGORIES, FIXED_EXPENSE_CATEGORIES, ExpenseCategory, FixedExpenseCategory, migrateFixedExpenseCategory } from "@/types/expenseCategory";

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

type DrillDownLevel = "overview" | "income-detail" | "savings-detail" | "goal-detail" | "expense-detail" | "fixed-expense-categories" | "onetime-expense-categories";

const SankeyFlowChart = ({
  expenses,
  incomes,
  savings,
  goals,
  fixedExpenses,
  selectedPeriod,
}: SankeyFlowChartProps) => {
  const { format: formatCurrency } = useCurrency();
  const [drillDownLevel, setDrillDownLevel] = useState<DrillDownLevel>("overview");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const sankeyData = useMemo<SankeyData>(() => {
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalSavings = savings.filter(s => s.savingType === "balance").reduce((sum, sav) => sum + sav.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const activeGoals = goals.filter(g => !g.completed && g.title);

    const cashIncome = incomes.filter(i => i.incomeType === "cash").reduce((sum, inc) => sum + inc.amount, 0);
    const accruedIncome = incomes.filter(i => i.incomeType === "accrued").reduce((sum, inc) => sum + inc.amount, 0);

    const fixedExpenseTotal = fixedExpenses.filter(f => f.isActive).reduce((sum, exp) => sum + exp.amount, 0);
    const discretionaryExpenseTotal = totalExpenses - fixedExpenseTotal;

    const goalLinkedExpenses = expenses.filter(e => goals.some(g => g.linkedExpenseId === e.id));
    const goalExpenseTotal = goalLinkedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    if (drillDownLevel === "overview") {
      nodes.push(
        { id: "income", name: "Income", color: "#8b5cf6", value: totalIncome },
        { id: "savings", name: "Savings", color: "#3b82f6", value: totalSavings },
        { id: "goals", name: "Goals", color: "#f59e0b", value: activeGoals.length * 1000 },
        { id: "expenses", name: "Expenses", color: "#ef4444", value: totalExpenses }
      );

      if (totalIncome > 0) {
        const savingsFlow = Math.min(totalSavings, totalIncome * 0.3);
        const expenseFlow = totalIncome - savingsFlow;

        links.push(
          { source: "income", target: "savings", value: savingsFlow, color: "#3b82f680" },
          { source: "income", target: "expenses", value: expenseFlow, color: "#ef444480" }
        );
      }

      if (totalSavings > 0 && activeGoals.length > 0) {
        const goalsFlow = Math.min(totalSavings * 0.4, activeGoals.length * 1000);
        links.push(
          { source: "savings", target: "goals", value: goalsFlow, color: "#f59e0b80" }
        );
      }

      if (goalExpenseTotal > 0) {
        links.push(
          { source: "goals", target: "expenses", value: goalExpenseTotal, color: "#ef444480" }
        );
      }
    } else if (drillDownLevel === "income-detail") {
      nodes.push(
        { id: "cash-income", name: "Cash Income", color: "#8b5cf6", value: cashIncome },
        { id: "accrued-income", name: "Accrued Income", color: "#a78bfa", value: accruedIncome },
        { id: "total-income", name: "Total Income", color: "#7c3aed", value: totalIncome }
      );

      if (cashIncome > 0) {
        links.push({ source: "cash-income", target: "total-income", value: cashIncome, color: "#8b5cf680" });
      }
      if (accruedIncome > 0) {
        links.push({ source: "accrued-income", target: "total-income", value: accruedIncome, color: "#a78bfa80" });
      }
    } else if (drillDownLevel === "goal-detail") {
      nodes.push({ id: "savings", name: "Savings", color: "#3b82f6", value: totalSavings });

      activeGoals.slice(0, 5).forEach((goal, idx) => {
        const linkedExpense = expenses.find(e => e.id === goal.linkedExpenseId);
        const goalValue = linkedExpense?.amount || 1000;
        nodes.push({
          id: `goal-${goal.id}`,
          name: goal.title.substring(0, 20),
          color: `hsl(${45 + idx * 30}, 85%, 55%)`,
          value: goalValue,
        });

        links.push({
          source: "savings",
          target: `goal-${goal.id}`,
          value: goalValue,
          color: `hsl(${45 + idx * 30}, 85%, 55%, 0.5)`,
        });
      });
    } else if (drillDownLevel === "expense-detail") {
      const oneTimeExpenseTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      nodes.push(
        { id: "expenses", name: "Total Expenses", color: "#ef4444", value: totalExpenses },
        { id: "fixed", name: "Fixed Expenses", color: "#dc2626", value: fixedExpenseTotal },
        { id: "onetime", name: "One-Time Expenses", color: "#f87171", value: oneTimeExpenseTotal }
      );

      if (fixedExpenseTotal > 0) {
        links.push({ source: "expenses", target: "fixed", value: fixedExpenseTotal, color: "#dc262680" });
      }
      if (oneTimeExpenseTotal > 0) {
        links.push({ source: "expenses", target: "onetime", value: oneTimeExpenseTotal, color: "#f8717180" });
      }
    } else if (drillDownLevel === "fixed-expense-categories") {
      nodes.push({ id: "fixed-expenses", name: "Fixed Expenses", color: "#dc2626", value: fixedExpenseTotal });

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
      nodes.push({ id: "onetime-expenses", name: "One-Time Expenses", color: "#f87171", value: oneTimeExpenseTotal });

      const expenseCategoryKeys: ExpenseCategory[] = ["food", "lifestyle", "family", "misc", "opex", "capex", "gna"];
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
  }, [drillDownLevel, incomes, expenses, savings, goals, fixedExpenses]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);

    if (drillDownLevel === "overview") {
      if (nodeId === "income") {
        setDrillDownLevel("income-detail");
      } else if (nodeId === "goals") {
        setDrillDownLevel("goal-detail");
      } else if (nodeId === "expenses") {
        setDrillDownLevel("expense-detail");
      }
    } else if (drillDownLevel === "expense-detail") {
      if (nodeId === "fixed") {
        setDrillDownLevel("fixed-expense-categories");
      } else if (nodeId === "onetime") {
        setDrillDownLevel("onetime-expense-categories");
      }
    }
  };

  const handleBack = () => {
    if (drillDownLevel === "fixed-expense-categories" || drillDownLevel === "onetime-expense-categories") {
      setDrillDownLevel("expense-detail");
    } else {
      setDrillDownLevel("overview");
    }
    setSelectedNodeId(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {drillDownLevel !== "overview" && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              Financial Flow Sankey Diagram
            </CardTitle>
            <CardDescription>
              {drillDownLevel === "overview" && "Click on nodes to drill down into details"}
              {drillDownLevel === "income-detail" && "Income sources breakdown"}
              {drillDownLevel === "goal-detail" && "Savings allocated to goals"}
              {drillDownLevel === "expense-detail" && "Expense categories breakdown - Click to view category details"}
              {drillDownLevel === "fixed-expense-categories" && "Fixed expense categories breakdown"}
              {drillDownLevel === "onetime-expense-categories" && "One-time expense categories breakdown"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SankeyVisualization
            data={sankeyData}
            onNodeClick={handleNodeClick}
            formatCurrency={formatCurrency}
            drillDownLevel={drillDownLevel}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-violet-50 dark:bg-violet-950 rounded-lg border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Total Income</span>
              </div>
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                {formatCurrency(incomes.reduce((s, i) => s + i.amount, 0))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <span className="text-xs font-medium">Savings</span>
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(savings.filter(s => s.savingType === "balance").reduce((s, sav) => s + sav.amount, 0))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <span className="text-xs font-medium">Active Goals</span>
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {goals.filter(g => !g.completed && g.title).length}
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Total Expenses</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
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
  drillDownLevel: DrillDownLevel;
}

const SankeyVisualization = ({ 
  data, 
  onNodeClick, 
  formatCurrency,
  drillDownLevel 
}: SankeyVisualizationProps) => {
  const svgWidth = 800;
  const svgHeight = 400;
  const nodeWidth = 20;
  const nodePadding = 30;

  const { nodes, links } = data;

  const maxValue = Math.max(...nodes.map(n => n.value), 1);

  const columns: { [key: number]: SankeyNode[] } = {};
  nodes.forEach((node, idx) => {
    const col = idx % 3;
    if (!columns[col]) columns[col] = [];
    columns[col].push(node);
  });

  const columnCount = Object.keys(columns).length;
  const columnWidth = svgWidth / (columnCount + 1);

  const isDetailView = drillDownLevel !== "overview";

  const positionedNodes = nodes.map((node, idx) => {
    let col: number;
    let rowIdx: number;
    let totalInCol: number;

    if (isDetailView) {
      const isSource = links.some(link => link.source === node.id);

      if (isSource) {
        col = 0;
        rowIdx = 0;
        totalInCol = 1;
      } else {
        col = 2;
        const targetNodes = nodes.filter(n => links.some(link => link.target === n.id));
        rowIdx = targetNodes.indexOf(node);
        totalInCol = targetNodes.length;
      }
    } else {
      col = idx % 3;
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
    <div className="w-full overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="mx-auto">
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
