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
import IncomeForm from "./IncomeForm";
import IncomeList from "./IncomeList";
import SavingForm from "./SavingForm";
import SavingList from "./SavingList";
import GoalList from "./GoalList";
import CombinedChart from "./CombinedChart";
import { Expense } from "@/types/expense";
import { Income } from "@/types/income";
import { Saving } from "@/types/saving";
import { Goal } from "@/types/goal";
import { toast } from "@/hooks/use-toast";
import { useCurrency, Currency } from "@/hooks/use-currency";

const ExpenseTracker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format, currency, setCurrency } = useCurrency();
  
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
      // Migrate old goals without deadline or isMagicWand
      return parsed.map((g: Goal) => ({
        ...g,
        deadline: g.deadline || "",
        isMagicWand: g.isMagicWand || false,
      }));
    }
    return [];
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

  // Saving handlers
  const addSaving = (saving: Omit<Saving, "id">) => {
    const newSaving: Saving = {
      ...saving,
      id: crypto.randomUUID(),
    };
    setSavings((prev) => [newSaving, ...prev]);
    toast({
      title: "Savings recorded",
      description: `Balance: ${format(saving.amount)}`,
    });
  };

  const deleteSaving = (id: string) => {
    setSavings((prev) => prev.filter((sav) => sav.id !== id));
    toast({ title: "Savings record deleted" });
  };

  const updateSaving = (id: string, updates: Partial<Omit<Saving, "id">>) => {
    setSavings((prev) =>
      prev.map((sav) => (sav.id === id ? { ...sav, ...updates } : sav))
    );
    toast({ title: "Savings updated" });
  };

  // Goal handlers
  const addGoal = (title: string, deadline: string) => {
    const activeGoals = goals.filter((g) => !g.completed && g.title);
    if (activeGoals.length >= 10) return;

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      deadline,
      completed: false,
      isMagicWand: false,
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => [...prev, newGoal]);
    toast({ title: "Goal added", description: title });
  };

  const reorderGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
  };

  const updateGoal = (id: string, updates: Partial<Omit<Goal, "id">>) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
  };

  // Export/Import
  const exportToCSV = () => {
    const goalsWithContent = goals.filter((g) => g.title.trim());
    if (expenses.length === 0 && incomes.length === 0 && savings.length === 0 && goalsWithContent.length === 0) {
      toast({
        title: "No data to export",
        variant: "destructive",
      });
      return;
    }

    let csvContent = "";

    // Export expenses
    if (expenses.length > 0) {
      csvContent += "### EXPENSES ###\n";
      csvContent += "Date,Description,Amount\n";
      expenses.forEach((exp) => {
        csvContent += `${exp.date},"${exp.description.replace(/"/g, '""')}",${exp.amount.toFixed(2)}\n`;
      });
    }

    // Export incomes
    if (incomes.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### INCOMES ###\n";
      csvContent += "Date,Source,Amount,Note\n";
      incomes.forEach((inc) => {
        csvContent += `${inc.date},"${inc.source.replace(/"/g, '""')}",${inc.amount.toFixed(2)},"${(inc.note || "").replace(/"/g, '""')}"\n`;
      });
    }

    // Export savings
    if (savings.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### SAVINGS ###\n";
      csvContent += "Date,Note,Amount\n";
      savings.forEach((sav) => {
        csvContent += `${sav.date},"${(sav.note || "").replace(/"/g, '""')}",${sav.amount.toFixed(2)}\n`;
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
      description: `${expenses.length} expenses, ${incomes.length} incomes, ${savings.length} savings, ${goalsWithContent.length} goals exported`,
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
        let currentSection: "expenses" | "incomes" | "savings" | "goals" | null = null;

        for (const line of lines) {
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
          if (line.toLowerCase().startsWith("date,") || line.toLowerCase().startsWith("title,")) continue;

          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (!matches) continue;

          if (currentSection === "goals") {
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
              importedIncomes.push({
                id: crypto.randomUUID(),
                date,
                source: field2,
                amount,
                note: field4 || undefined,
              });
            } else if (currentSection === "savings") {
              importedSavings.push({
                id: crypto.randomUUID(),
                date,
                amount,
                note: field2 || undefined,
              });
            }
          }
        }

        const hasData = importedExpenses.length > 0 || importedIncomes.length > 0 || importedSavings.length > 0 || importedGoals.length > 0;
        if (hasData) {
          if (importedExpenses.length > 0) setExpenses(importedExpenses);
          if (importedIncomes.length > 0) setIncomes(importedIncomes);
          if (importedSavings.length > 0) setSavings(importedSavings);
          if (importedGoals.length > 0) {
            // Merge imported goals with empty slots to maintain 10 goals max
            const finalGoals = [
              ...importedGoals.slice(0, 10),
            ];
            setGoals(finalGoals);
          }
          toast({
            title: "Imported successfully",
            description: `${importedExpenses.length} expenses, ${importedIncomes.length} incomes, ${importedSavings.length} savings, ${importedGoals.length} goals imported`,
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncomes = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const netCashFlow = totalIncomes - totalExpenses;
  const latestSavings = savings.length > 0
    ? [...savings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount
    : 0;

  const filteredExpenses = expenses.filter((exp) =>
    exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.date.includes(searchQuery) ||
    exp.amount.toString().includes(searchQuery)
  );

  const filteredIncomes = incomes.filter((inc) =>
    inc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inc.date.includes(searchQuery) ||
    inc.amount.toString().includes(searchQuery) ||
    (inc.note && inc.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSavings = savings.filter((sav) =>
    sav.date.includes(searchQuery) ||
    sav.amount.toString().includes(searchQuery) ||
    (sav.note && sav.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cash Flow Tracker</h1>
          <p className="text-muted-foreground">Track your income, spending, and savings</p>
        </header>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="expenses" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
              <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                🍁 Is spending this money driving you away from living in Canada?
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-card p-5">
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

        <CombinedChart expenses={expenses} incomes={incomes} savings={savings} />
      </div>
    </div>
  );
};

export default ExpenseTracker;
