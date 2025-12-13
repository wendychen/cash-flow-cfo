import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PiggyBank } from "lucide-react";
import { Saving } from "@/types/saving";

interface SavingFormProps {
  onAddSaving: (saving: Omit<Saving, "id">) => void;
}

const SavingForm = ({ onAddSaving }: SavingFormProps) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    onAddSaving({
      date,
      amount: parseFloat(amount),
      note: note.trim() || undefined,
    });

    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Note (optional)</label>
        <Input
          type="text"
          placeholder="Monthly savings, bonus, etc."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Balance</label>
        <Input
          type="number"
          placeholder="0.00"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-card"
        />
      </div>
      <Button type="submit" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
        <PiggyBank className="w-4 h-4 mr-1.5" />
        Add
      </Button>
    </form>
  );
};

export default SavingForm;
