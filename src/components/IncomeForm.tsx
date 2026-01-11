import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";
import { Income } from "@/types/income";
import { useCurrency, Currency } from "@/hooks/use-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IncomeFormProps {
  onAddIncome: (income: Omit<Income, "id">) => void;
}

const IncomeForm = ({ onAddIncome }: IncomeFormProps) => {
  const { convertToNTD } = useCurrency();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [inputCurrency, setInputCurrency] = useState<Currency>("NTD");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !source.trim()) return;

    const amountInNTD = convertToNTD(parseFloat(amount), inputCurrency);

    onAddIncome({
      date,
      source: source.trim(),
      amount: amountInNTD,
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
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-card flex-1"
              required
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
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Note (optional)</label>
          <Input
            type="text"
            placeholder="Is this income bringing you closer to living in Canada?"
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
