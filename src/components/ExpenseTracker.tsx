import { useState, useEffect, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import ExpenseChart from "./ExpenseChart";
import { Expense } from "@/types/expense";
import { toast } from "@/hooks/use-toast";
import { useCurrency, Currency } from "@/hooks/use-currency";

const ExpenseTracker = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format, currency, setCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

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
    toast({
      title: "Expense deleted",
    });
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
    toast({
      title: "Expense updated",
    });
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast({
        title: "No expenses to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Date", "Description", "Amount"];
    const rows = expenses.map((exp) => [
      exp.date,
      `"${exp.description.replace(/"/g, '""')}"`,
      exp.amount.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: `${expenses.length} expenses exported to CSV`,
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
        
        // Skip header if present
        const startIndex = lines[0]?.toLowerCase().includes("date") ? 1 : 0;
        
        const importedExpenses: Expense[] = [];
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          // Parse CSV handling quoted strings
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          if (matches && matches.length >= 3) {
            const date = matches[0].replace(/"/g, "").trim();
            const description = matches[1].replace(/"/g, "").trim();
            const amount = parseFloat(matches[2].replace(/"/g, "").trim());
            
            if (date && description && !isNaN(amount)) {
              importedExpenses.push({
                id: crypto.randomUUID(),
                date,
                description,
                amount,
                needsCheck: false,
              });
            }
          }
        }

        if (importedExpenses.length > 0) {
          setExpenses(importedExpenses);
          toast({
            title: "Imported successfully",
            description: `${importedExpenses.length} expenses imported (replaced existing records)`,
          });
        } else {
          toast({
            title: "No expenses found",
            description: "Check your CSV format (Date, Description, Amount)",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid CSV format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cash Flow Tracker</h1>
          <p className="text-muted-foreground">Track your spending and savings</p>
        </header>

        <div className="bg-card rounded-xl shadow-card p-5 mb-6">
          <ExpenseForm onAddExpense={addExpense} />
        </div>

        <div className="flex items-center gap-3 mb-4 p-3 bg-card rounded-lg shadow-card">
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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{format(total)}</p>
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

        <ExpenseChart expenses={expenses} />

        <div className="mt-6">
          <ExpenseList
            expenses={expenses}
            onDeleteExpense={deleteExpense}
            onToggleNeedsCheck={toggleNeedsCheck}
            onUpdateExpense={updateExpense}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseTracker;
