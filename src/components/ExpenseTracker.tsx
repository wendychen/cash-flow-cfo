import { useState, useEffect, useRef } from "react";
import { Download, Upload } from "lucide-react";
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
import SavingForm from "./SavingForm";
import SavingList from "./SavingList";
import CombinedChart from "./CombinedChart";
import { Expense } from "@/types/expense";
import { Saving } from "@/types/saving";
import { toast } from "@/hooks/use-toast";
import { useCurrency, Currency } from "@/hooks/use-currency";

const ExpenseTracker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format, currency, setCurrency } = useCurrency();
  
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses");
    return saved ? JSON.parse(saved) : [];
  });

  const [savings, setSavings] = useState<Saving[]>(() => {
    const saved = localStorage.getItem("savings");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("savings", JSON.stringify(savings));
  }, [savings]);

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

  // Export/Import
  const exportToCSV = () => {
    if (expenses.length === 0 && savings.length === 0) {
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

    // Export savings
    if (savings.length > 0) {
      if (csvContent) csvContent += "\n";
      csvContent += "### SAVINGS ###\n";
      csvContent += "Date,Note,Amount\n";
      savings.forEach((sav) => {
        csvContent += `${sav.date},"${(sav.note || "").replace(/"/g, '""')}",${sav.amount.toFixed(2)}\n`;
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
      description: `${expenses.length} expenses, ${savings.length} savings exported`,
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
        const importedSavings: Saving[] = [];
        let currentSection: "expenses" | "savings" | null = null;

        for (const line of lines) {
          if (line.includes("### EXPENSES ###")) {
            currentSection = "expenses";
            continue;
          }
          if (line.includes("### SAVINGS ###")) {
            currentSection = "savings";
            continue;
          }
          if (line.toLowerCase().startsWith("date,")) continue;

          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 3) continue;

          const date = matches[0].replace(/"/g, "").trim();
          const field2 = matches[1].replace(/"/g, "").trim();
          const amount = parseFloat(matches[2].replace(/"/g, "").trim());

          if (!date || isNaN(amount)) continue;

          if (currentSection === "expenses" && field2) {
            importedExpenses.push({
              id: crypto.randomUUID(),
              date,
              description: field2,
              amount,
              needsCheck: false,
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

        if (importedExpenses.length > 0 || importedSavings.length > 0) {
          if (importedExpenses.length > 0) setExpenses(importedExpenses);
          if (importedSavings.length > 0) setSavings(importedSavings);
          toast({
            title: "Imported successfully",
            description: `${importedExpenses.length} expenses, ${importedSavings.length} savings imported`,
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
  const latestSavings = savings.length > 0
    ? [...savings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].amount
    : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cash Flow Tracker</h1>
          <p className="text-muted-foreground">Track your spending and savings</p>
        </header>

        <Tabs defaultValue="expenses" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
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
              expenses={expenses}
              onDeleteExpense={deleteExpense}
              onToggleNeedsCheck={toggleNeedsCheck}
              onUpdateExpense={updateExpense}
            />
          </TabsContent>

          <TabsContent value="savings" className="space-y-4">
            <div className="bg-card rounded-xl shadow-card p-5">
              <SavingForm onAddSaving={addSaving} />
            </div>

            <SavingList
              savings={savings}
              onDeleteSaving={deleteSaving}
              onUpdateSaving={updateSaving}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">{format(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Savings</p>
              <p className="text-2xl font-bold text-emerald-600">{format(latestSavings)}</p>
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

        <CombinedChart expenses={expenses} savings={savings} />
      </div>
    </div>
  );
};

export default ExpenseTracker;
