import { useCurrency } from "@/hooks/use-currency";
import { ArrowRight, Wallet, PiggyBank, Target, Receipt } from "lucide-react";

interface ConsciousnessFlowProps {
  totalIncome: number;
  totalSavings: number;
  goalCount: number;
  totalExpenses: number;
}

const ConsciousnessFlow = ({
  totalIncome,
  totalSavings,
  goalCount,
  totalExpenses,
}: ConsciousnessFlowProps) => {
  const { format } = useCurrency();

  const steps = [
    {
      icon: Wallet,
      label: "Income",
      value: format(totalIncome),
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
    {
      icon: PiggyBank,
      label: "Savings",
      value: format(totalSavings),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      icon: Target,
      label: "Goals",
      value: `${goalCount} active`,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    {
      icon: Receipt,
      label: "Expenses",
      value: format(totalExpenses),
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
  ];

  return (
    <div className="bg-card rounded-xl shadow-card p-4">
      <h3 className="font-semibold text-foreground mb-4 text-center">Financial Flow</h3>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${step.bgColor} ${step.borderColor}`}>
              <step.icon className={`h-6 w-6 ${step.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
              <span className={`text-sm font-bold ${step.color}`}>{step.value}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        Income funds savings, which enables goals, which drive expenses
      </p>
    </div>
  );
};

export default ConsciousnessFlow;
