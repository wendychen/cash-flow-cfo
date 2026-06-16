import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PiggyBank, Target } from "lucide-react";
import { Saving, SavingType } from "@/types/saving";
import { useCurrency, Currency } from "@/hooks/use-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavingFormProps {
  onAddSaving: (saving: Omit<Saving, "id">) => void;
}

const SavingForm = ({ onAddSaving }: SavingFormProps) => {
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<Currency>("NTD");
  const [note, setNote] = useState("");
  const [savingType, setSavingType] = useState<SavingType>("balance");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    const amountInNTD = convertToNTD(parseFloat(amount), inputCurrency);

    onAddSaving({
      date,
      amount: amountInNTD,
      note: note.trim() || undefined,
      savingType,
    });

    setAmount("");
    setNote("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="w-28 shrink-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Type</label>
        <Select value={savingType} onValueChange={(val) => setSavingType(val as SavingType)}>
          <SelectTrigger className="bg-card" data-testid="select-saving-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balance">Balance</SelectItem>
            <SelectItem value="goal">Goal</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
          placeholder="Is this saving bringing you closer to living in Canada?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-card"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card flex-1"
          />
          <Select value={inputCurrency} onValueChange={(val) => setInputCurrency(val as Currency)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NTD">NTD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className={`shrink-0 ${savingType === "goal" ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
        {savingType === "goal" ? <Target className="w-4 h-4 mr-1.5" /> : <PiggyBank className="w-4 h-4 mr-1.5" />}
        Add
      </Button>
    </form>
  );
};

export default SavingForm;
