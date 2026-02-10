import { useState, useEffect, useRef } from "react";
import { Download, Upload, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import FixedExpenseForm from "./FixedExpenseForm";
import FixedExpenseList from "./FixedExpenseList";
import IncomeForm from "./IncomeForm";
import IncomeList from "./IncomeList";
import SavingForm from "./SavingForm";
import SavingList from "./SavingList";
import GoalList from "./GoalList";
import GoalBudgetAllocator from "./GoalBudgetAllocator";
import ConsciousnessFlow from "./ConsciousnessFlow";
import CombinedChart from "./CombinedChart";
import MonthlySummary from "./MonthlySummary";
import SankeyFlowChart from "./SankeyFlowChart";
import TimeNavigator, { TimePeriod } from "./TimeNavigator";
import { Expense } from "@/types/expense";
import { FixedExpense } from "@/types/fixedExpense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { Goal } from "@/types/goal";
import { TaskNode, TaskType } from "@/types/task";
import { FinancialTarget } from "@/types/target";
import { ExpenseCategory, FixedExpenseCategory } from "@/types/expenseCategory";
import { toast } from "@/hooks/use-toast";
import { useCurrency, Currency } from "@/hooks/use-currency";

const isDateInPeriod = (dateStr: string, period: TimePeriod | null): boolean => {
  if (!period) return true;
  const date = new Date(dateStr);
  return date >= period.startDate && date <= period.endDate;
};

const TASK_PREFIX: Record<TaskType, string> = {
  pre: "[Pre-task]",
  post: "[Post-task]",
  dream: "[Dream]",
};

const ExpenseTracker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format, currency, setCurrency, convertToNTD, convertFromNTD } = useCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | null>(null);
  const [isTimeNavOpen, setIsTimeNavOpen] = useState(true);
  const [isCashFlowOpen, setIsCashFlowOpen] = useState(true);
  const [isSankeyOpen, setIsSankeyOpen] = useState(true);

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((exp: Expense) => ({
        ...exp,
        category: exp.category || "misc",
        linkedGoalId: exp.linkedGoalId || undefined,
        linkedTaskId: exp.linkedTaskId || undefined,
        linkedTaskType: exp.linkedTaskType || undefined,
      }));
    }
    return [];
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem("incomes");
    return saved ? JSON.parse(saved) : [];
  });

  const [savings, setSavings] = useState<Saving[]>(() => {
    const saved = localStorage.getItem("savings");
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<TaskNode[]>(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) return JSON.parse(saved);

    const goalsData = localStorage.getItem("goals");
    if (!goalsData) return [];

    const parsedGoals = JSON.parse(goalsData);
    const migrated: TaskNode[] = [];

    for (const goal of parsedGoals) {
      const preTasks = goal.preTasks || goal.subTasks || [];
      preTasks.forEach((task: any, i: number) => {
        migrated.push({
          id: task.id,
          goalId: goal.id,
          parentId: null,
          taskType: "pre" as const,
          sortOrder: i,
          title: task.action || "",
          cost: task.cost || 0,
          timeCost: task.timeCost || "",
          deadline: task.deadline || "",
          isMagicWand: task.isMagicWand || false,
          completed: task.completed || false,
          linkedExpenseId: task.linkedExpenseId || undefined,
          createdAt: new Date().toISOString(),
        });
      });

      const postTasks = goal.postTasks || [];
      postTasks.forEach((task: any, i: number) => {
        migrated.push({
          id: task.id,
          goalId: goal.id,
          parentId: null,
          taskType: "post" as const,
          sortOrder: i,
          title: task.action || "",
          cost: task.cost || 0,
          timeCost: task.timeCost || "",
          deadline: task.deadline || "",
          isMagicWand: task.isMagicWand || false,
          completed: task.completed || false,
          linkedExpenseId: task.linkedExpenseId || undefined,
          createdAt: new Date().toISOString(),
        });
      });

      const postDreams = goal.postDreams || [];
      postDreams.forEach((dream: any, i: number) => {
        migrated.push({
          id: dream.id,
          goalId: goal.id,
          parentId: null,
          taskType: "dream" as const,
          sortOrder: i,
          title: dream.title || "",
          cost: dream.cost || 0,
          timeCost: dream.timeCost || "",
          deadline: dream.deadline || "",
          isMagicWand: dream.isMagicWand || false,
          completed: false,
          linkedExpenseId: dream.linkedExpenseId || undefined,
          createdAt: new Date().toISOString(),
        });
      });
    }

    return migrated;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem("goals");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((g: any) => ({
        id: g.id,
        title: g.title || "",
        deadline: g.deadline || "",
        completed: g.completed || false,
        isMagicWand: g.isMagicWand || false,
        createdAt: g.createdAt || new Date().toISOString(),
        linkedExpenseId: g.linkedExpenseId || undefined,
        category: g.category || "misc",
        budget: g.budget || 0,
        ideations: g.ideations || [],
        constraint: g.constraint || "",
        urlPack: g.urlPack || [],
      }));
    }
    return [];
  });

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => {
    const saved = localStorage.getItem("fixedExpenses");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((exp: FixedExpense) => ({
        ...exp,
        category: exp.category || "housing",
      }));
    }
    return [];
  });

  const [targets, setTargets] = useState<FinancialTarget[]>(() => {
    const saved = localStorage.getItem("financialTargets");
    return saved ? JSON.parse(saved) : [];
  });

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("incomes", JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem("savings", JSON.stringify(savings));
  }, [savings]);

  useEffect(() => {
    localStorage.setItem("goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("fixedExpenses", JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  useEffect(() => {
    localStorage.setItem("financialTargets", JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    const goalsWithTitle = goals.filter(g => g.title);
    const missingExpenseGoals = goalsWithTitle.filter(g => {
      if (g.linkedExpenseId) {
        const expenseExists = expenses.some(e => e.id === g.linkedExpenseId);
        if (expenseExists) return false;
      }
      const hasLinkedExpense = expenses.some(e => e.linkedGoalId === g.id && !e.linkedTaskId);
      return !hasLinkedExpense;
    });

    if (missingExpenseGoals.length === 0) return;

    const newExpenses: Expense[] = [];
    const goalUpdates: { id: string; linkedExpenseId: string }[] = [];

    missingExpenseGoals.forEach(goal => {
      const expenseId = crypto.randomUUID();
      newExpenses.push({
        id: expenseId,
        date: goal.deadline || new Date().toISOString().split("T")[0],
        description: `Goal: ${goal.title}`,
        amount: 0,
        needsCheck: true,
        category: goal.category || "misc",
        linkedGoalId: goal.id,
      });
      goalUpdates.push({ id: goal.id, linkedExpenseId: expenseId });
    });

    setExpenses(prev => [...prev, ...newExpenses]);
    setGoals(prev => prev.map(g => {
      const update = goalUpdates.find(u => u.id === g.id);
      return update ? { ...g, linkedExpenseId: update.linkedExpenseId } : g;
    }));
  }, []);

  const updateTarget = (type: FinancialTarget["type"], amount: number, period: FinancialTarget["period"], targetCurrency: Currency, skipSavingSync = false) => {
    setTargets(prev => {
      const existingIndex = prev.findIndex(t => t.type === type && t.period === period && t.currency === targetCurrency);
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          amount,
          updatedAt: now,
        };
        return updated;
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          type,
          amount,
          currency: targetCurrency,
          period,
          createdAt: now,
          updatedAt: now,
        }];
      }
    });

    if (type === "savings" && !skipSavingSync) {
      const amountInNTD = convertToNTD(amount, targetCurrency);
      const today = new Date().toISOString().split("T")[0];

      setSavings(prev => {
        const goalSavings = prev.filter(s => s.savingType === "goal");
        const latestGoal = goalSavings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (latestGoal) {
          return prev.map(s => s.id === latestGoal.id ? { ...s, amount: amountInNTD } : s);
        } else {
          return [{
            id: crypto.randomUUID(),
            date: today,
            amount: amountInNTD,
            savingType: "goal" as const,
            note: "Savings goal",
          }, ...prev];
        }
      });
    }
  };

  const getTarget = (type: FinancialTarget["type"], period: FinancialTarget["period"], targetCurrency: Currency): FinancialTarget | undefined => {
    return targets.find(t => t.type === type && t.period === period && t.currency === targetCurrency);
  };

  const addExpense = (expense: Omit<Expense, "id">) => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      needsCheck: false,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    toast({
      title: "Expense added",
      description: `${expense.description} - ${format(expense.amount)}`,
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    toast({ title: "Expense deleted" });
  };

  const toggleNeedsCheck = (id: string) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === id ? { ...exp, needsCheck: !exp.needsCheck } : exp
      )
    );
  };

  const updateExpense = (id: string, updates: Partial<Omit<Expense, "id">>) => {
    const expense = expenses.find(e => e.id === id);
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );

    if (expense?.linkedGoalId && !expense.linkedTaskId) {
      const goalUpdates: Partial<Goal> = {};
      if (updates.description !== undefined) {
        goalUpdates.title = updates.description.replace(/^Goal:\s*/i, "");
      }
      if (updates.date !== undefined) {
        goalUpdates.deadline = updates.date;
      }
      if (updates.category !== undefined) {
        goalUpdates.category = updates.category;
      }
      if (Object.keys(goalUpdates).length > 0) {
        setGoals((prev) =>
          prev.map((g) => (g.id === expense.linkedGoalId ? { ...g, ...goalUpdates } : g))
        );
      }
    }

    if (expense?.linkedGoalId && expense.linkedTaskId) {
      const taskId = expense.linkedTaskId;
      const taskType = expense.linkedTaskType || "pre";
      const prefix = TASK_PREFIX[taskType as TaskType] || "";
      const taskUpdates: Partial<TaskNode> = {};

      if (updates.description !== undefined) {
        taskUpdates.title = updates.description.replace(new RegExp(`^\\${prefix.replace("[", "\\[").replace("]", "\\]")}\\s*`, "i"), "");
      }
      if (updates.amount !== undefined) {
        taskUpdates.cost = updates.amount;
      }
      if (updates.date !== undefined) {
        taskUpdates.deadline = updates.date;
      }
      if (Object.keys(taskUpdates).length > 0) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...taskUpdates } : t))
        );
      }
    }

    toast({ title: "Expense updated" });
  };

  const addIncome = (income: Omit<Income, "id">) => {
    const newIncome: Income = {
      ...income,
      id: crypto.randomUUID(),
    };
    setIncomes((prev) => [newIncome, ...prev]);
    toast({
      title: "Income added",
      description: `${income.source} - ${format(income.amount)}`,
    });
  };

  const deleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((inc) => inc.id !== id));
    toast({ title: "Income deleted" });
  };

  const updateIncome = (id: string, updates: Partial<Omit<Income, "id">>) => {
    setIncomes((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...updates } : inc))
    );
    toast({ title: "Income updated" });
  };

  const addSaving = (saving: Omit<Saving, "id">) => {
    const newSaving: Saving = {
      ...saving,
      id: crypto.randomUUID(),
    };
    setSavings((prev) => [newSaving, ...prev]);

    if (saving.savingType === "goal") {
      const amountInDisplayCurrency = convertFromNTD(saving.amount, currency);
      updateTarget("savings", amountInDisplayCurrency, "monthly", currency, true);
    }

    toast({
      title: saving.savingType === "goal" ? "Savings goal set" : "Savings recorded",
      description: `${saving.savingType === "goal" ? "Goal" : "Balance"}: ${format(saving.amount)}`,
    });
  };

  const deleteSaving = (id: string) => {
    setSavings((prev) => prev.filter((sav) => sav.id !== id));
    toast({ title: "Savings record deleted" });
  };

  const updateSaving = (id: string, updates: Partial<Omit<Saving, "id">>) => {
    const existingSaving = savings.find(s => s.id === id);

    setSavings((prev) =>
      prev.map((sav) => (sav.id === id ? { ...sav, ...updates } : sav))
    );

    const newType = updates.savingType ?? existingSaving?.savingType;
    const newAmount = updates.amount ?? existingSaving?.amount;
    const wasGoal = existingSaving?.savingType === "goal";
    const isGoal = newType === "goal";

    if (isGoal && newAmount !== undefined && (updates.amount !== undefined || (!wasGoal && isGoal))) {
      const amountInDisplayCurrency = convertFromNTD(newAmount, currency);
      updateTarget("savings", amountInDisplayCurrency, "monthly", currency, true);
    }

    toast({ title: "Savings updated" });
  };

  const addGoal = (title: string, deadline: string) => {
    const goalId = crypto.randomUUID();
    const expenseId = crypto.randomUUID();

    const linkedExpense: Expense = {
      id: expenseId,
      date: deadline || new Date().toISOString().split("T")[0],
      description: `Goal: ${title}`,
      amount: 0,
      needsCheck: true,
      category: "misc",
      linkedGoalId: goalId,
    };

    const newGoal: Goal = {
      id: goalId,
      title,
      deadline,
      completed: false,
      isMagicWand: false,
      createdAt: new Date().toISOString(),
      linkedExpenseId: expenseId,
      category: "misc",
      budget: 0,
      ideations: [],
      constraint: "",
      urlPack: [],
    };

    setExpenses((prev) => [...prev, linkedExpense]);
    setGoals((prev) => [...prev, newGoal]);
    toast({ title: "Goal added", description: title });
  };

  const reorderGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
  };

  const updateGoal = (id: string, updates: Partial<Omit<Goal, "id">>) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );

    if (goal.linkedExpenseId) {
      const expenseUpdates: Partial<Expense> = {};
      if (updates.deadline) {
        expenseUpdates.date = updates.deadline;
      }
      if (updates.title) {
        expenseUpdates.description = `Goal: ${updates.title}`;
      }
      if (updates.category) {
        expenseUpdates.category = updates.category;
      }
      if (Object.keys(expenseUpdates).length > 0) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === goal.linkedExpenseId ? { ...e, ...expenseUpdates } : e))
        );
      }
    }

    if (updates.category) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.linkedGoalId === id ? { ...e, category: updates.category! } : e
        )
      );
    }
  };

  const deleteGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);

    const expenseIdsToDelete: string[] = [];
    if (goal?.linkedExpenseId) {
      expenseIdsToDelete.push(goal.linkedExpenseId);
    }

    const goalTasks = tasks.filter(t => t.goalId === id);
    goalTasks.forEach(t => {
      if (t.linkedExpenseId) {
        expenseIdsToDelete.push(t.linkedExpenseId);
      }
    });

    if (expenseIdsToDelete.length > 0) {
      setExpenses((prev) => prev.filter((e) => !expenseIdsToDelete.includes(e.id)));
    }

    setTasks((prev) => prev.filter((t) => t.goalId !== id));
    setGoals((prev) => prev.filter((g) => g.id !== id));
    toast({ title: "Goal deleted" });
  };

  const addTask = (
    goalId: string,
    parentId: string | null,
    taskType: TaskType,
    data: { title: string; cost: number; timeCost: string; deadline: string }
  ) => {
    const goal = goals.find(g => g.id === goalId);
    const taskId = crypto.randomUUID();
    const expenseId = crypto.randomUUID();

    const siblings = tasks.filter(
      t => t.goalId === goalId && t.taskType === taskType && t.parentId === parentId
    );

    const linkedExpense: Expense = {
      id: expenseId,
      date: data.deadline || new Date().toISOString().split("T")[0],
      description: `${TASK_PREFIX[taskType]} ${data.title}`,
      amount: data.cost,
      needsCheck: false,
      category: goal?.category || "misc",
      linkedGoalId: goalId,
      linkedTaskId: taskId,
      linkedTaskType: taskType,
    };

    const newTask: TaskNode = {
      id: taskId,
      goalId,
      parentId,
      taskType,
      sortOrder: siblings.length,
      title: data.title,
      cost: data.cost,
      timeCost: data.timeCost,
      deadline: data.deadline,
      isMagicWand: false,
      completed: false,
      linkedExpenseId: expenseId,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => [...prev, newTask]);
    setExpenses(prev => [...prev, linkedExpense]);
  };

  const updateTask = (taskId: string, updates: Partial<TaskNode>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    if (task.linkedExpenseId) {
      const expenseUpdates: Partial<Expense> = {};
      if (updates.title !== undefined) {
        expenseUpdates.description = `${TASK_PREFIX[task.taskType]} ${updates.title}`;
      }
      if (updates.cost !== undefined) {
        expenseUpdates.amount = updates.cost;
      }
      if (updates.deadline !== undefined && updates.deadline) {
        expenseUpdates.date = updates.deadline;
      }
      if (Object.keys(expenseUpdates).length > 0) {
        setExpenses(prev =>
          prev.map(e => e.id === task.linkedExpenseId ? { ...e, ...expenseUpdates } : e)
        );
      }
    }
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.parentId === taskId) {
          return { ...t, parentId: task.parentId };
        }
        return t;
      });
      return updated.filter(t => t.id !== taskId);
    });

    if (task.linkedExpenseId) {
      setExpenses(prev => prev.filter(e => e.id !== task.linkedExpenseId));
    }
  };

  const reorderTasks = (reordered: TaskNode[]) => {
    setTasks(prev => {
      const updated = [...prev];
      for (const task of reordered) {
        const idx = updated.findIndex(t => t.id === task.id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], sortOrder: task.sortOrder, parentId: task.parentId };
        }
      }
      return updated;
    });
  };

  const moveTask = (taskId: string, newParentId: string | null) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, parentId: newParentId } : t));
  };

  const addFixedExpense = (expense: Omit<FixedExpense, "id" | "createdAt">) => {
    const newExpense: FixedExpense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setFixedExpenses((prev) => [...prev, newExpense]);
    toast({
      title: "Fixed expense added",
      description: `${expense.description} - ${format(expense.amount)}`,
    });
  };

  const deleteFixedExpense = (id: string) => {
    setFixedExpenses((prev) => prev.filter((exp) => exp.id !== id));
    toast({ title: "Fixed expense deleted" });
  };

  const updateFixedExpense = (id: string, updates: Partial<Omit<FixedExpense, "id">>) => {
    setFixedExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
    toast({ title: "Fixed expense updated" });
  };

  const escCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const jsonCsv = (val: unknown) => `"${JSON.stringify(val).replace(/"/g, '""')}"`;

  const exportToCSV = () => {
    const goalsWithContent = goals.filter((g) => g.title.trim());
    if (expenses.length === 0 && incomes.length === 0 && savings.length === 0 && goalsWithContent.length === 0 && fixedExpenses.length === 0 && targets.length === 0 && tasks.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    let csvContent = "";

    if (fixedExpenses.length > 0) {
      csvContent += "### FIXED EXPENSES ###\n";
      csvContent += "Description,Amount,Frequency,IsActive,Category,CreatedAt\n";
      fixedExpenses.forEach((exp) => {
        csvContent += `${escCsv(exp.description)},${exp.amount.toFixed(2)},${exp.frequency},${exp.isActive},${exp.category},${exp.createdAt}\n`;
      });
    }

    if (expenses.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### EXPENSES ###\n";
      csvContent += "Date,Description,Amount,Category,NeedsCheck,ReviewCount,LinkedGoalId,LinkedTaskId,LinkedTaskType\n";
      expenses.forEach((exp) => {
        csvContent += `${exp.date},${escCsv(exp.description)},${exp.amount.toFixed(2)},${exp.category},${exp.needsCheck},${exp.reviewCount ?? ""},${exp.linkedGoalId || ""},${exp.linkedTaskId || ""},${exp.linkedTaskType || ""}\n`;
      });
    }

    if (incomes.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### INCOMES ###\n";
      csvContent += "Date,Source,Amount,Note,IncomeType,ReviewCount\n";
      incomes.forEach((inc) => {
        csvContent += `${inc.date},${escCsv(inc.source)},${inc.amount.toFixed(2)},${escCsv(inc.note || "")},${inc.incomeType || "cash"},${inc.reviewCount ?? ""}\n`;
      });
    }

    if (savings.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### SAVINGS ###\n";
      csvContent += "Date,Note,Amount,SavingType,ReviewCount\n";
      savings.forEach((sav) => {
        csvContent += `${sav.date},${escCsv(sav.note || "")},${sav.amount.toFixed(2)},${sav.savingType || "balance"},${sav.reviewCount ?? ""}\n`;
      });
    }

    if (goalsWithContent.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### GOALS ###\n";
      csvContent += "Title,Deadline,Completed,IsMagicWand,Category,Constraint,CreatedAt,UrlPack,Ideations,Budget\n";
      goalsWithContent.forEach((goal) => {
        csvContent += `${escCsv(goal.title)},${goal.deadline || ""},${goal.completed},${goal.isMagicWand || false},${goal.category || "misc"},${escCsv(goal.constraint || "")},${goal.createdAt},${jsonCsv(goal.urlPack || [])},${jsonCsv(goal.ideations || [])},${goal.budget || 0}\n`;
      });
    }

    if (tasks.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### TASKS ###\n";
      csvContent += "Id,GoalId,ParentId,TaskType,SortOrder,Title,Cost,TimeCost,Deadline,IsMagicWand,Completed,LinkedExpenseId,CreatedAt\n";
      tasks.forEach((t) => {
        csvContent += `${t.id},${t.goalId},${t.parentId || ""},${t.taskType},${t.sortOrder},${escCsv(t.title)},${t.cost},${escCsv(t.timeCost || "")},${t.deadline || ""},${t.isMagicWand},${t.completed},${t.linkedExpenseId || ""},${t.createdAt}\n`;
      });
    }

    if (targets.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### TARGETS ###\n";
      csvContent += "Type,Amount,Period,Currency,CreatedAt,UpdatedAt\n";
      targets.forEach((target) => {
        csvContent += `${target.type},${target.amount.toFixed(2)},${target.period},${target.currency},${target.createdAt},${target.updatedAt}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cashflow-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: `${fixedExpenses.length} fixed, ${expenses.length} expenses, ${incomes.length} incomes, ${savings.length} savings, ${goalsWithContent.length} goals, ${tasks.length} tasks, ${targets.length} targets`,
    });
  };

  const parseCsvFields = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const parseJsonField = <T,>(val: string, fallback: T): T => {
    if (!val) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        const importedExpenses: Expense[] = [];
        const importedIncomes: Income[] = [];
        const importedSavings: Saving[] = [];
        const importedGoals: Goal[] = [];
        const importedTasks: TaskNode[] = [];
        const importedFixedExpenses: FixedExpense[] = [];
        const importedTargets: FinancialTarget[] = [];
        let currentSection: "expenses" | "incomes" | "savings" | "goals" | "tasks" | "fixedExpenses" | "targets" | null = null;
        let goalsFormat: "old" | "new" | null = null;

        for (const line of lines) {
          if (line.includes("### FIXED EXPENSES ###")) {
            currentSection = "fixedExpenses";
            continue;
          }
          if (line.includes("### EXPENSES ###")) {
            currentSection = "expenses";
            continue;
          }
          if (line.includes("### INCOMES ###")) {
            currentSection = "incomes";
            continue;
          }
          if (line.includes("### SAVINGS ###")) {
            currentSection = "savings";
            continue;
          }
          if (line.includes("### GOALS ###")) {
            currentSection = "goals";
            continue;
          }
          if (line.includes("### TASKS ###")) {
            currentSection = "tasks";
            continue;
          }
          if (line.includes("### TARGETS ###")) {
            currentSection = "targets";
            continue;
          }

          if (currentSection === "goals" && goalsFormat === null && line.toLowerCase().startsWith("title,")) {
            goalsFormat = line.includes("PreTasks") ? "old" : "new";
            continue;
          }

          if (line.toLowerCase().startsWith("date,") || line.toLowerCase().startsWith("title,") || line.toLowerCase().startsWith("description,") || line.toLowerCase().startsWith("type,") || line.toLowerCase().startsWith("id,")) continue;

          const f = parseCsvFields(line);
          if (f.length < 2) continue;

          if (currentSection === "fixedExpenses") {
            if (f.length < 3) continue;
            const description = f[0];
            const amount = parseFloat(f[1]);
            const frequency = f[2] as "weekly" | "monthly" | "quarterly" | "yearly";
            const isActive = f[3]?.toLowerCase() !== "false";
            const categoryField = f[4];
            const validFixedCategories: FixedExpenseCategory[] = ["housing", "utilities", "transportation", "health", "financial-obligations", "taxes"];
            const category = (categoryField && validFixedCategories.includes(categoryField as FixedExpenseCategory))
              ? (categoryField as FixedExpenseCategory)
              : "housing";
            const createdAt = f[5] || new Date().toISOString();

            if (description && !isNaN(amount)) {
              importedFixedExpenses.push({
                id: crypto.randomUUID(),
                description,
                amount,
                frequency: frequency || "monthly",
                isActive,
                category,
                createdAt,
              });
            }
          } else if (currentSection === "goals") {
            if (goalsFormat === "old") {
              const title = f[0];
              const deadline = f[1] || "";
              const completed = f[2]?.toLowerCase() === "true";
              const isMagicWand = f[3]?.toLowerCase() === "true";
              const categoryField = f[4];
              const validCategories: ExpenseCategory[] = ["food", "lifestyle", "family", "misc"];
              const category = (categoryField && validCategories.includes(categoryField as ExpenseCategory))
                ? (categoryField as ExpenseCategory)
                : "misc";
              const constraint = f[5] || "";
              const createdAt = f[6] || new Date().toISOString();
              const urlPack = parseJsonField<string[]>(f[7], []);
              const preTasks = parseJsonField<any[]>(f[8], []);
              const postTasks = parseJsonField<any[]>(f[9], []);
              const postDreams = parseJsonField<any[]>(f[10], []);
              const ideations = parseJsonField(f[11], []);

              if (title) {
                const goalId = crypto.randomUUID();
                importedGoals.push({
                  id: goalId,
                  title,
                  deadline,
                  completed,
                  isMagicWand,
                  category,
                  createdAt,
                  constraint,
                  urlPack,
                  ideations,
                  budget: 0,
                });

                preTasks.forEach((task: any, i: number) => {
                  importedTasks.push({
                    id: task.id || crypto.randomUUID(),
                    goalId,
                    parentId: null,
                    taskType: "pre",
                    sortOrder: i,
                    title: task.action || "",
                    cost: task.cost || 0,
                    timeCost: task.timeCost || "",
                    deadline: task.deadline || "",
                    isMagicWand: task.isMagicWand || false,
                    completed: task.completed || false,
                    linkedExpenseId: task.linkedExpenseId || undefined,
                    createdAt: new Date().toISOString(),
                  });
                });

                postTasks.forEach((task: any, i: number) => {
                  importedTasks.push({
                    id: task.id || crypto.randomUUID(),
                    goalId,
                    parentId: null,
                    taskType: "post",
                    sortOrder: i,
                    title: task.action || "",
                    cost: task.cost || 0,
                    timeCost: task.timeCost || "",
                    deadline: task.deadline || "",
                    isMagicWand: task.isMagicWand || false,
                    completed: task.completed || false,
                    linkedExpenseId: task.linkedExpenseId || undefined,
                    createdAt: new Date().toISOString(),
                  });
                });

                postDreams.forEach((dream: any, i: number) => {
                  importedTasks.push({
                    id: dream.id || crypto.randomUUID(),
                    goalId,
                    parentId: null,
                    taskType: "dream",
                    sortOrder: i,
                    title: dream.title || "",
                    cost: dream.cost || 0,
                    timeCost: dream.timeCost || "",
                    deadline: dream.deadline || "",
                    isMagicWand: dream.isMagicWand || false,
                    completed: false,
                    linkedExpenseId: dream.linkedExpenseId || undefined,
                    createdAt: new Date().toISOString(),
                  });
                });
              }
            } else {
              const title = f[0];
              const deadline = f[1] || "";
              const completed = f[2]?.toLowerCase() === "true";
              const isMagicWand = f[3]?.toLowerCase() === "true";
              const categoryField = f[4];
              const validCategories: ExpenseCategory[] = ["food", "lifestyle", "family", "misc"];
              const category = (categoryField && validCategories.includes(categoryField as ExpenseCategory))
                ? (categoryField as ExpenseCategory)
                : "misc";
              const constraint = f[5] || "";
              const createdAt = f[6] || new Date().toISOString();
              const urlPack = parseJsonField<string[]>(f[7], []);
              const ideations = parseJsonField(f[8], []);
              const budget = parseFloat(f[9]) || 0;

              if (title) {
                importedGoals.push({
                  id: crypto.randomUUID(),
                  title,
                  deadline,
                  completed,
                  isMagicWand,
                  category,
                  createdAt,
                  constraint,
                  urlPack,
                  ideations,
                  budget,
                });
              }
            }
          } else if (currentSection === "tasks") {
            if (f.length < 11) continue;
            const id = f[0];
            const goalId = f[1];
            const parentId = f[2] || null;
            const taskType = f[3] as TaskType;
            const sortOrder = parseInt(f[4]) || 0;
            const title = f[5];
            const cost = parseFloat(f[6]) || 0;
            const timeCost = f[7] || "";
            const deadline = f[8] || "";
            const isMagicWand = f[9]?.toLowerCase() === "true";
            const completed = f[10]?.toLowerCase() === "true";
            const linkedExpenseId = f[11] || undefined;
            const createdAt = f[12] || new Date().toISOString();

            if (id && goalId && ["pre", "post", "dream"].includes(taskType)) {
              importedTasks.push({
                id,
                goalId,
                parentId,
                taskType,
                sortOrder,
                title,
                cost,
                timeCost,
                deadline,
                isMagicWand,
                completed,
                linkedExpenseId,
                createdAt,
              });
            }
          } else if (currentSection === "targets") {
            if (f.length < 4) continue;
            const type = f[0] as FinancialTarget["type"];
            const amount = parseFloat(f[1]);
            const period = f[2] as FinancialTarget["period"];
            const cur = f[3] as "NTD" | "USD" | "CAD";
            const createdAt = f[4] || new Date().toISOString();
            const updatedAt = f[5] || createdAt;

            if (["income", "expense", "savings"].includes(type) && !isNaN(amount) && ["weekly", "monthly", "quarterly", "yearly"].includes(period) && ["NTD", "USD", "CAD"].includes(cur)) {
              importedTargets.push({
                id: crypto.randomUUID(),
                type,
                amount,
                period,
                currency: cur,
                createdAt,
                updatedAt,
              });
            }
          } else if (currentSection === "expenses") {
            if (f.length < 3) continue;
            const date = f[0];
            const description = f[1];
            const amount = parseFloat(f[2]);
            if (!date || !description || isNaN(amount)) continue;

            const validCategories: ExpenseCategory[] = ["food", "lifestyle", "family", "misc"];
            const category = (f[3] && validCategories.includes(f[3] as ExpenseCategory))
              ? (f[3] as ExpenseCategory)
              : "misc";
            const needsCheck = f[4]?.toLowerCase() === "true";
            const reviewCount = f[5] ? parseInt(f[5]) : undefined;
            const linkedGoalId = f[6] || undefined;
            const linkedTaskId = f[7] || undefined;
            const linkedTaskType = (f[8] === "pre" || f[8] === "post" || f[8] === "dream") ? f[8] as "pre" | "post" | "dream" : undefined;

            importedExpenses.push({
              id: crypto.randomUUID(),
              date,
              description,
              amount,
              category,
              needsCheck,
              reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : undefined,
              linkedGoalId,
              linkedTaskId,
              linkedTaskType,
            });
          } else if (currentSection === "incomes") {
            if (f.length < 3) continue;
            const date = f[0];
            const source = f[1];
            const amount = parseFloat(f[2]);
            if (!date || !source || isNaN(amount)) continue;

            const note = f[3] || undefined;
            const incomeType = f[4] === "accrued" ? "accrued" as const : "cash" as const;
            const reviewCount = f[5] ? parseInt(f[5]) : undefined;

            importedIncomes.push({
              id: crypto.randomUUID(),
              date,
              source,
              amount,
              incomeType,
              note,
              reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : undefined,
            });
          } else if (currentSection === "savings") {
            if (f.length < 3) continue;
            const date = f[0];
            const note = f[1] || undefined;
            const amount = parseFloat(f[2]);
            if (!date || isNaN(amount)) continue;

            const savingType = f[3] === "goal" ? "goal" as const : "balance" as const;
            const reviewCount = f[4] ? parseInt(f[4]) : undefined;

            importedSavings.push({
              id: crypto.randomUUID(),
              date,
              amount,
              note,
              savingType,
              reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : undefined,
            });
          }
        }

        const hasData = importedExpenses.length > 0 || importedIncomes.length > 0 || importedSavings.length > 0 || importedGoals.length > 0 || importedTasks.length > 0 || importedFixedExpenses.length > 0 || importedTargets.length > 0;
        if (hasData) {
          if (importedFixedExpenses.length > 0) setFixedExpenses(importedFixedExpenses);
          if (importedExpenses.length > 0) setExpenses(importedExpenses);
          if (importedIncomes.length > 0) setIncomes(importedIncomes);
          if (importedSavings.length > 0) setSavings(importedSavings);
          if (importedGoals.length > 0) setGoals(importedGoals);
          if (importedTasks.length > 0) setTasks(importedTasks);
          if (importedTargets.length > 0) setTargets(importedTargets);
          toast({
            title: "Imported successfully",
            description: `${importedFixedExpenses.length} fixed, ${importedExpenses.length} expenses, ${importedIncomes.length} incomes, ${importedSavings.length} savings, ${importedGoals.length} goals, ${importedTasks.length} tasks, ${importedTargets.length} targets`,
          });
        } else {
          toast({
            title: "No data found",
            description: "Check your CSV format",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Import failed",
          description: "Invalid CSV format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const periodFilteredExpenses = expenses.filter((exp) => isDateInPeriod(exp.date, selectedPeriod));
  const periodFilteredIncomes = incomes.filter((inc) => isDateInPeriod(inc.date, selectedPeriod));
  const periodFilteredSavings = savings.filter((sav) => isDateInPeriod(sav.date, selectedPeriod));

  const totalExpenses = periodFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncomes = periodFilteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalSavings = periodFilteredSavings.filter(s => s.savingType === "balance").reduce((sum, sav) => sum + sav.amount, 0);
  const activeGoalCount = goals.filter((g) => !g.completed && g.title).length;
  const netCashFlow = totalIncomes - totalExpenses;
  const latestSavings = periodFilteredSavings.length > 0
    ? [...periodFilteredSavings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount
    : 0;
  const latestSavingsBalance = periodFilteredSavings.filter(s => s.savingType === "balance").length > 0
    ? [...periodFilteredSavings.filter(s => s.savingType === "balance")].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount
    : 0;

  const filteredExpenses = expenses.filter((exp) =>
    isDateInPeriod(exp.date, selectedPeriod) && (
      exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.date.includes(searchQuery) ||
      exp.amount.toString().includes(searchQuery)
    )
  );

  const filteredIncomes = incomes.filter((inc) =>
    isDateInPeriod(inc.date, selectedPeriod) && (
      inc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.date.includes(searchQuery) ||
      inc.amount.toString().includes(searchQuery) ||
      (inc.note && inc.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const filteredSavings = savings.filter((sav) =>
    isDateInPeriod(sav.date, selectedPeriod) && (
      sav.date.includes(searchQuery) ||
      sav.amount.toString().includes(searchQuery) ||
      (sav.note && sav.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cash Flow CFO</h1>
          <p className="text-muted-foreground">I'm your cash flow CFO to help you fulfill your future goals.</p>
        </header>

        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-6">
              <Collapsible open={isTimeNavOpen} onOpenChange={setIsTimeNavOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-3 hover:bg-accent">
                    <span className="font-semibold text-sm">Time Navigator</span>
                    {isTimeNavOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TimeNavigator
                    selectedPeriod={selectedPeriod}
                    onSelectPeriod={setSelectedPeriod}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <div className="lg:hidden mb-4">
              <Collapsible open={isTimeNavOpen} onOpenChange={setIsTimeNavOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-3 hover:bg-accent border border-border rounded-lg mb-2">
                    <span className="font-semibold text-sm">Time Navigator</span>
                    {isTimeNavOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TimeNavigator
                    selectedPeriod={selectedPeriod}
                    onSelectPeriod={setSelectedPeriod}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Tabs defaultValue="expenses" className="mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="savings">Savings</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
              </TabsList>

              <TabsContent value="expenses" className="space-y-4">
                <div className="bg-card rounded-xl shadow-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    Fixed Expenses
                  </h3>
                  <FixedExpenseForm onAddFixedExpense={addFixedExpense} />
                  <div className="mt-4">
                    <FixedExpenseList
                      fixedExpenses={fixedExpenses}
                      onUpdateFixedExpense={updateFixedExpense}
                      onDeleteFixedExpense={deleteFixedExpense}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                  <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    Is spending this money driving you away from living in Canada?
                  </p>
                </div>

                <div className="bg-card rounded-xl shadow-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">One-time Expenses</h3>
                  <ExpenseForm onAddExpense={addExpense} />
                </div>

                <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-card">
                  <Switch
                    id="future-check"
                    checked={expenses.some(
                      (exp) => exp.date > new Date().toISOString().split("T")[0] && exp.needsCheck
                    )}
                    onCheckedChange={(checked) => {
                      const today = new Date().toISOString().split("T")[0];
                      setExpenses((prev) =>
                        prev.map((exp) =>
                          exp.date > today ? { ...exp, needsCheck: checked } : exp
                        )
                      );
                    }}
                    className="data-[state=checked]:bg-yellow-400"
                  />
                  <Label htmlFor="future-check" className="text-sm text-muted-foreground cursor-pointer">
                    Mark all future transactions for review
                  </Label>
                </div>

                <ExpenseList
                  expenses={filteredExpenses}
                  onDeleteExpense={deleteExpense}
                  onToggleNeedsCheck={toggleNeedsCheck}
                  onUpdateExpense={updateExpense}
                />
              </TabsContent>

              <TabsContent value="income" className="space-y-4">
                <div className="bg-card rounded-xl shadow-card p-5">
                  <IncomeForm onAddIncome={addIncome} />
                </div>

                <IncomeList
                  incomes={filteredIncomes}
                  onDeleteIncome={deleteIncome}
                  onUpdateIncome={updateIncome}
                />
              </TabsContent>

              <TabsContent value="savings" className="space-y-4">
                <div className="bg-card rounded-xl shadow-card p-5">
                  <SavingForm onAddSaving={addSaving} />
                </div>

                <SavingList
                  savings={filteredSavings}
                  onDeleteSaving={deleteSaving}
                  onUpdateSaving={updateSaving}
                />

                <div className="bg-card rounded-xl shadow-card p-5">
                  <GoalBudgetAllocator
                    goals={goals}
                    tasks={tasks}
                    latestSavingsBalance={latestSavingsBalance}
                    onUpdateGoal={updateGoal}
                  />
                </div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                <div className="bg-card rounded-xl shadow-card p-5">
                  <GoalList
                    goals={goals.filter((g) => g.title)}
                    allGoals={goals}
                    tasks={tasks}
                    onUpdateGoal={updateGoal}
                    onAddGoal={addGoal}
                    onDeleteGoal={deleteGoal}
                    onReorderGoals={reorderGoals}
                    onAddTask={addTask}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                    onReorderTasks={reorderTasks}
                    onMoveTask={moveTask}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-xl font-bold text-violet-600">{format(totalIncomes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-xl font-bold text-foreground">{format(totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {netCashFlow >= 0 ? '+' : ''}{format(netCashFlow)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Savings</p>
                  <p className="text-xl font-bold text-emerald-600">{format(latestSavings)}</p>
                </div>
                <Select value={currency} onValueChange={(val) => setCurrency(val as Currency)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NTD">NTD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={importFromCSV}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
                <Button variant="outline" onClick={exportToCSV} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            <ConsciousnessFlow
              totalIncome={totalIncomes}
              totalSavings={totalSavings}
              goalCount={activeGoalCount}
              totalExpenses={totalExpenses}
            />

            <MonthlySummary
              expenses={periodFilteredExpenses}
              incomes={periodFilteredIncomes}
              savings={periodFilteredSavings}
              fixedExpenses={fixedExpenses}
            />

            <Collapsible open={isCashFlowOpen} onOpenChange={setIsCashFlowOpen} className="mb-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-4 hover:bg-accent rounded-none">
                    <span className="font-semibold text-base">Cash Flow Trend</span>
                    {isCashFlowOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CombinedChart
                    expenses={periodFilteredExpenses}
                    incomes={periodFilteredIncomes}
                    savings={periodFilteredSavings}
                    targets={targets}
                    onUpdateTarget={updateTarget}
                    selectedPeriod={selectedPeriod}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible open={isSankeyOpen} onOpenChange={setIsSankeyOpen}>
              <div className="border border-border rounded-xl overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-4 hover:bg-accent rounded-none">
                    <span className="font-semibold text-base">Financial Flow Diagram</span>
                    {isSankeyOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SankeyFlowChart
                    expenses={periodFilteredExpenses}
                    incomes={periodFilteredIncomes}
                    savings={periodFilteredSavings}
                    goals={goals}
                    fixedExpenses={fixedExpenses}
                    selectedPeriod={selectedPeriod}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
