import { Goal } from "@/types/goal";
import { TaskNode } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Target, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useMemo } from "react";

interface GoalBudgetAllocatorProps {
  goals: Goal[];
  tasks: TaskNode[];
  latestSavingsBalance: number;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
}

const GoalBudgetAllocator = ({
  goals,
  tasks,
  latestSavingsBalance,
  onUpdateGoal,
}: GoalBudgetAllocatorProps) => {
  const { format } = useCurrency();

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.completed && g.title),
    [goals]
  );

  const totalAllocated = useMemo(
    () => activeGoals.reduce((sum, g) => sum + (g.budget || 0), 0),
    [activeGoals]
  );

  const goalCosts = useMemo(() => {
    const costs = new Map<string, number>();
    for (const goal of activeGoals) {
      const goalTasks = tasks.filter((t) => t.goalId === goal.id);
      const total = goalTasks.reduce((sum, t) => sum + t.cost, 0);
      costs.set(goal.id, total);
    }
    return costs;
  }, [activeGoals, tasks]);

  const progressPercent =
    latestSavingsBalance > 0
      ? Math.min(100, (totalAllocated / latestSavingsBalance) * 100)
      : 0;

  if (activeGoals.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active goals to allocate budget to</p>
        <p className="text-xs mt-1">Create goals in the Goals tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-foreground">Goal Budget Allocation</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Allocated: {format(totalAllocated)}
          </span>
          <span className="text-muted-foreground">
            Savings Balance: {format(latestSavingsBalance)}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {totalAllocated > latestSavingsBalance && (
          <p className="text-xs text-red-500">
            Over-allocated by {format(totalAllocated - latestSavingsBalance)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {activeGoals.map((goal) => {
          const estimatedCost = goalCosts.get(goal.id) || 0;
          const budgetProgress =
            estimatedCost > 0
              ? Math.min(100, ((goal.budget || 0) / estimatedCost) * 100)
              : 0;

          return (
            <div
              key={goal.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-emerald-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{goal.title}</p>
                {estimatedCost > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={budgetProgress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(goal.budget || 0)} / {format(estimatedCost)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={goal.budget || ""}
                  onChange={(e) =>
                    onUpdateGoal(goal.id, {
                      budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-24 h-8 text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoalBudgetAllocator;
