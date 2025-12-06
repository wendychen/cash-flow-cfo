import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import { Expense } from "@/types/expense";
import { toast } from "@/hooks/use-toast";

const ExpenseTracker = () => {
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
      description: `${expense.description} - $${expense.amount.toFixed(2)}`,
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

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Expense Tracker</h1>
          <p className="text-muted-foreground">Track your daily expenses</p>
        </header>

        <div className="bg-card rounded-xl shadow-card p-5 mb-6">
          <ExpenseForm onAddExpense={addExpense} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">${total.toFixed(2)}</p>
          </div>
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <ExpenseList
          expenses={expenses}
          onDeleteExpense={deleteExpense}
          onToggleNeedsCheck={toggleNeedsCheck}
          onUpdateExpense={updateExpense}
        />
      </div>
    </div>
  );
};

export default ExpenseTracker;
