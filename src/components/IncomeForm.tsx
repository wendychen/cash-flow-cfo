import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import { Income } from "@/types/income";

interface IncomeFormProps {
  onAddIncome: (income: Omit<Income, "id">) => void;
}

const IncomeForm = ({ onAddIncome }: IncomeFormProps) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !source.trim()) return;

    onAddIncome({
      date,
      source: source.trim(),
      amount: parseFloat(amount),
      note: note.trim() || undefined,
    });

    setSource("");
    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="flex-[2] min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Source</label>
          <Input
            type="text"
            placeholder="Salary, Freelance, Dividend..."
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-card"
            required
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount</label>
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card"
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Note (optional)</label>
          <Input
            type="text"
            placeholder="Additional details..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-card"
          />
        </div>
        <Button type="submit" className="shrink-0 bg-violet-600 hover:bg-violet-700">
          <Wallet className="w-4 h-4 mr-1.5" />
          Add Income
        </Button>
      </div>
    </form>
  );
};

export default IncomeForm;
