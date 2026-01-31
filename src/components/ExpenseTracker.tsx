import { useState, useEffect, useRef } from "react";
import { Download, Upload, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FinancialTarget } from "@/types/target";
import { toast } from "@/hooks/use-toast";
import { useCurrency, Currency } from "@/hooks/use-currency";

const isDateInPeriod = (dateStr: string, period: TimePeriod | null): boolean => {
  if (!period) return true;
  const date = new Date(dateStr);
  return date >= period.startDate && date <= period.endDate;
};

const ExpenseTracker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format, currency, setCurrency, convertToNTD, convertFromNTD } = useCurrency();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod | null>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses");
    return saved ? JSON.parse(saved) : [];
  });

  const [incomes, setIncomes] = useState<Income[]>(() => {
    const saved = localStorage.getItem("incomes");
    return saved ? JSON.parse(saved) : [];
  });

  const [savings, setSavings] = useState<Saving[]>(() => {
    const saved = localStorage.getItem("savings");
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem("goals");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((g: Goal & { subTasks?: unknown[] }) => ({
        ...g,
        deadline: g.deadline || "",
        isMagicWand: g.isMagicWand || false,
        preTasks: g.preTasks || g.subTasks || [],
        postTasks: g.postTasks || [],
        postDreams: g.postDreams || [],
        ideations: g.ideations || [],
        constraint: g.constraint || "",
        urlPack: g.urlPack || [],
        linkedExpenseId: g.linkedExpenseId || undefined,
      }));
    }
    return [];
  });

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => {
    const saved = localStorage.getItem("fixedExpenses");
    return saved ? JSON.parse(saved) : [];
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
    localStorage.setItem("fixedExpenses", JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  useEffect(() => {
    localStorage.setItem("financialTargets", JSON.stringify(targets));
  }, [targets]);

  // Target handlers with bidirectional sync for savings
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

    // When updating a savings target, sync to the latest goal saving entry
    if (type === "savings" && !skipSavingSync) {
      // Convert target amount (in targetCurrency) to NTD for storage
      const amountInNTD = convertToNTD(amount, targetCurrency);
      const today = new Date().toISOString().split("T")[0];
      
      setSavings(prev => {
        // Find the latest goal saving by date
        const goalSavings = prev.filter(s => s.savingType === "goal");
        const latestGoal = goalSavings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (latestGoal) {
          // Update the latest goal saving
          return prev.map(s => s.id === latestGoal.id ? { ...s, amount: amountInNTD } : s);
        } else {
          // Create a new goal saving for today
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

  // Expense handlers
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
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
    toast({ title: "Expense updated" });
  };

  // Income handlers
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

  // Saving handlers with bidirectional sync for goals
  const addSaving = (saving: Omit<Saving, "id">) => {
    const newSaving: Saving = {
      ...saving,
      id: crypto.randomUUID(),
    };
    setSavings((prev) => [newSaving, ...prev]);
    
    // If adding a goal saving, sync to savings target (using skipSavingSync to prevent loop)
    // Note: saving.amount is already in NTD, need to convert to current display currency for target
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
    
    // Sync to target if:
    // 1. Amount changed and saving is/becomes a goal
    // 2. Type changed to goal (regardless of amount change)
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

  // Goal handlers
  const addGoal = (title: string, deadline: string) => {
    const activeGoals = goals.filter((g) => !g.completed && g.title);
    if (activeGoals.length >= 10) return;

    const goalId = crypto.randomUUID();
    const expenseId = crypto.randomUUID();
    
    const linkedExpense: Expense = {
      id: expenseId,
      date: deadline || new Date().toISOString().split("T")[0],
      description: `Goal: ${title}`,
      amount: 0,
      needsCheck: true,
    };
    
    const newGoal: Goal = {
      id: goalId,
      title,
      deadline,
      completed: false,
      isMagicWand: false,
      createdAt: new Date().toISOString(),
      linkedExpenseId: expenseId,
      preTasks: [],
      postTasks: [],
      postDreams: [],
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
    
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
    
    if (goal?.linkedExpenseId) {
      const expenseUpdates: Partial<Expense> = {};
      if (updates.deadline) {
        expenseUpdates.date = updates.deadline;
      }
      if (updates.title) {
        expenseUpdates.description = `Goal: ${updates.title}`;
      }
      if (Object.keys(expenseUpdates).length > 0) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === goal.linkedExpenseId ? { ...e, ...expenseUpdates } : e))
        );
      }
    }
  };
  
  const deleteGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (goal?.linkedExpenseId) {
      setExpenses((prev) => prev.filter((e) => e.id !== goal.linkedExpenseId));
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    toast({ title: "Goal deleted" });
  };

  // Fixed Expense handlers
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

  // Export/Import
  const exportToCSV = () => {
    const goalsWithContent = goals.filter((g) => g.title.trim());
    if (expenses.length === 0 && incomes.length === 0 && savings.length === 0 && goalsWithContent.length === 0 && fixedExpenses.length === 0 && targets.length === 0) {
      toast({
        title: "No data to export",
        variant: "destructive",
      });
      return;
    }

    let csvContent = "";

    // Export fixed expenses
    if (fixedExpenses.length > 0) {
      csvContent += "### FIXED EXPENSES ###\n";
      csvContent += "Description,Amount,Frequency,IsActive,CreatedAt\n";
      fixedExpenses.forEach((exp) => {
        csvContent += `"${exp.description.replace(/"/g, '""')}",${exp.amount.toFixed(2)},${exp.frequency},${exp.isActive},${exp.createdAt}\n`;
      });
    }

    // Export expenses
    if (expenses.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### EXPENSES ###\n";
      csvContent += "Date,Description,Amount\n";
      expenses.forEach((exp) => {
        csvContent += `${exp.date},"${exp.description.replace(/"/g, '""')}",${exp.amount.toFixed(2)}\n`;
      });
    }

    // Export incomes (including incomeType)
    if (incomes.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### INCOMES ###\n";
      csvContent += "Date,Source,Amount,Note,IncomeType\n";
      incomes.forEach((inc) => {
        csvContent += `${inc.date},"${inc.source.replace(/"/g, '""')}",${inc.amount.toFixed(2)},"${(inc.note || "").replace(/"/g, '""')}",${inc.incomeType || "cash"}\n`;
      });
    }

    // Export savings (including savingType)
    if (savings.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### SAVINGS ###\n";
      csvContent += "Date,Note,Amount,SavingType\n";
      savings.forEach((sav) => {
        csvContent += `${sav.date},"${(sav.note || "").replace(/"/g, '""')}",${sav.amount.toFixed(2)},${sav.savingType || "balance"}\n`;
      });
    }

    // Export goals
    if (goalsWithContent.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### GOALS ###\n";
      csvContent += "Title,Deadline,Completed,IsMagicWand,CreatedAt\n";
      goalsWithContent.forEach((goal) => {
        csvContent += `"${goal.title.replace(/"/g, '""')}",${goal.deadline || ""},${goal.completed},${goal.isMagicWand || false},${goal.createdAt}\n`;
      });
    }

    // Export financial targets
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
      description: `${fixedExpenses.length} fixed, ${expenses.length} expenses, ${incomes.length} incomes, ${savings.length} savings, ${goalsWithContent.length} goals, ${targets.length} targets`,
    });
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
        const importedFixedExpenses: FixedExpense[] = [];
        const importedTargets: FinancialTarget[] = [];
        let currentSection: "expenses" | "incomes" | "savings" | "goals" | "fixedExpenses" | "targets" | null = null;

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
          if (line.includes("### TARGETS ###")) {
            currentSection = "targets";
            continue;
          }
          if (line.toLowerCase().startsWith("date,") || line.toLowerCase().startsWith("title,") || line.toLowerCase().startsWith("description,") || line.toLowerCase().startsWith("type,")) continue;

          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (!matches) continue;

          if (currentSection === "fixedExpenses") {
            if (matches.length < 3) continue;
            const description = matches[0].replace(/"/g, "").trim();
            const amount = parseFloat(matches[1].replace(/"/g, "").trim());
            const frequency = matches[2]?.replace(/"/g, "").trim() as "weekly" | "monthly" | "quarterly" | "yearly";
            const isActive = matches[3]?.replace(/"/g, "").trim().toLowerCase() !== "false";
            const createdAt = matches[4]?.replace(/"/g, "").trim() || new Date().toISOString();

            if (description && !isNaN(amount)) {
              importedFixedExpenses.push({
                id: crypto.randomUUID(),
                description,
                amount,
                frequency: frequency || "monthly",
                isActive,
                createdAt,
              });
            }
          } else if (currentSection === "goals") {
            if (matches.length < 2) continue;
            const title = matches[0].replace(/"/g, "").trim();
            const deadline = matches[1]?.replace(/"/g, "").trim() || "";
            const completed = matches[2]?.replace(/"/g, "").trim().toLowerCase() === "true";
            const isMagicWand = matches[3]?.replace(/"/g, "").trim().toLowerCase() === "true";
            const createdAt = matches[4]?.replace(/"/g, "").trim() || new Date().toISOString();

            if (title) {
              importedGoals.push({
                id: crypto.randomUUID(),
                title,
                deadline,
                completed,
                isMagicWand,
                createdAt,
                preTasks: [],
                postTasks: [],
                postDreams: [],
                ideations: [],
                constraint: "",
                urlPack: [],
              });
            }
          } else if (currentSection === "targets") {
            if (matches.length < 4) continue;
            const type = matches[0].replace(/"/g, "").trim() as FinancialTarget["type"];
            const amount = parseFloat(matches[1].replace(/"/g, "").trim());
            const period = matches[2]?.replace(/"/g, "").trim() as FinancialTarget["period"];
            const currency = matches[3]?.replace(/"/g, "").trim() as "NTD" | "USD" | "CAD";
            const createdAt = matches[4]?.replace(/"/g, "").trim() || new Date().toISOString();
            const updatedAt = matches[5]?.replace(/"/g, "").trim() || createdAt;

            if (["income", "expense", "savings"].includes(type) && !isNaN(amount) && ["weekly", "monthly", "quarterly", "yearly"].includes(period) && ["NTD", "USD", "CAD"].includes(currency)) {
              importedTargets.push({
                id: crypto.randomUUID(),
                type,
                amount,
                period,
                currency,
                createdAt,
                updatedAt,
              });
            }
          } else {
            if (matches.length < 3) continue;
            const date = matches[0].replace(/"/g, "").trim();
            const field2 = matches[1].replace(/"/g, "").trim();
            const amount = parseFloat(matches[2].replace(/"/g, "").trim());
            const field4 = matches[3]?.replace(/"/g, "").trim();

            if (!date || isNaN(amount)) continue;

            if (currentSection === "expenses" && field2) {
              importedExpenses.push({
                id: crypto.randomUUID(),
                date,
                description: field2,
                amount,
                needsCheck: false,
              });
            } else if (currentSection === "incomes" && field2) {
              const incomeType = matches[4]?.replace(/"/g, "").trim() as "cash" | "accrued" || "cash";
              importedIncomes.push({
                id: crypto.randomUUID(),
                date,
                source: field2,
                amount,
                incomeType: incomeType === "accrued" ? "accrued" : "cash",
                note: field4 || undefined,
              });
            } else if (currentSection === "savings") {
              const savingType = matches[3]?.replace(/"/g, "").trim() as "balance" | "goal" || "balance";
              importedSavings.push({
                id: crypto.randomUUID(),
                date,
                amount,
                note: field2 || undefined,
                savingType: savingType === "goal" ? "goal" : "balance",
              });
            }
          }
        }

        const hasData = importedExpenses.length > 0 || importedIncomes.length > 0 || importedSavings.length > 0 || importedGoals.length > 0 || importedFixedExpenses.length > 0 || importedTargets.length > 0;
        if (hasData) {
          if (importedFixedExpenses.length > 0) setFixedExpenses(importedFixedExpenses);
          if (importedExpenses.length > 0) setExpenses(importedExpenses);
          if (importedIncomes.length > 0) setIncomes(importedIncomes);
          if (importedSavings.length > 0) setSavings(importedSavings);
          if (importedGoals.length > 0) {
            const finalGoals = [...importedGoals.slice(0, 10)];
            setGoals(finalGoals);
          }
          if (importedTargets.length > 0) setTargets(importedTargets);
          toast({
            title: "Imported successfully",
            description: `${importedFixedExpenses.length} fixed, ${importedExpenses.length} expenses, ${importedIncomes.length} incomes, ${importedSavings.length} savings, ${importedGoals.length} goals, ${importedTargets.length} targets`,
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
              <TimeNavigator
                selectedPeriod={selectedPeriod}
                onSelectPeriod={setSelectedPeriod}
              />
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
              <TimeNavigator
                selectedPeriod={selectedPeriod}
                onSelectPeriod={setSelectedPeriod}
              />
            </div>

            <Tabs defaultValue="expenses" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            {/* Fixed Expenses Section */}
            <div className="bg-card rounded-xl shadow-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                🔄 Fixed Expenses
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
                🍁 Is spending this money driving you away from living in Canada?
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
              <GoalList
                goals={goals.filter((g) => g.title)}
                allGoals={goals}
                onUpdateGoal={updateGoal}
                onAddGoal={addGoal}
                onDeleteGoal={deleteGoal}
                onReorderGoals={reorderGoals}
              />
            </div>

            <div className="bg-card rounded-xl shadow-card p-5">
              <SavingForm onAddSaving={addSaving} />
            </div>

            <SavingList
              savings={filteredSavings}
              onDeleteSaving={deleteSaving}
              onUpdateSaving={updateSaving}
              />
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

            <CombinedChart
              expenses={periodFilteredExpenses}
              incomes={periodFilteredIncomes}
              savings={periodFilteredSavings}
              targets={targets}
              onUpdateTarget={updateTarget}
              selectedPeriod={selectedPeriod}
            />

            <SankeyFlowChart
              expenses={periodFilteredExpenses}
              incomes={periodFilteredIncomes}
              savings={periodFilteredSavings}
              goals={goals}
              fixedExpenses={fixedExpenses}
              selectedPeriod={selectedPeriod}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
