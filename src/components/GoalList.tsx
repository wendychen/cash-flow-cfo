import { useState } from "react";
import { Goal } from "@/types/goal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";

interface GoalListProps {
  goals: Goal[];
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onAddGoal: (title: string) => void;
}

const GoalList = ({ goals, onUpdateGoal, onAddGoal }: GoalListProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [editingGoals, setEditingGoals] = useState<Record<string, string>>({});

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const canAddGoal = activeGoals.length < 10;

  const handleAddGoal = () => {
    if (newGoalTitle.trim() && canAddGoal) {
      onAddGoal(newGoalTitle.trim());
      setNewGoalTitle("");
    }
  };

  const handleTitleChange = (id: string, title: string) => {
    setEditingGoals((prev) => ({ ...prev, [id]: title }));
  };

  const handleTitleBlur = (id: string) => {
    const newTitle = editingGoals[id];
    if (newTitle !== undefined && newTitle.trim()) {
      onUpdateGoal(id, { title: newTitle.trim() });
    }
    setEditingGoals((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const renderGoalItem = (goal: Goal) => {
    const isEditing = editingGoals[goal.id] !== undefined;
    const displayTitle = isEditing ? editingGoals[goal.id] : goal.title;

    return (
      <div
        key={goal.id}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          goal.completed
            ? "bg-muted/50 border-muted"
            : "bg-card border-border hover:border-primary/30"
        }`}
      >
        <Checkbox
          checked={goal.completed}
          onCheckedChange={(checked) =>
            onUpdateGoal(goal.id, { completed: checked === true })
          }
          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
        <Input
          value={displayTitle}
          onChange={(e) => handleTitleChange(goal.id, e.target.value)}
          onBlur={() => handleTitleBlur(goal.id)}
          className={`flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 ${
            goal.completed ? "line-through text-muted-foreground" : ""
          }`}
          placeholder="Enter goal..."
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-foreground">2026 Goals</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {activeGoals.length}/10 active
        </span>
      </div>

      {/* Active goals */}
      <div className="space-y-2">
        {activeGoals.map(renderGoalItem)}
      </div>

      {/* Add goal form */}
      {canAddGoal && (
        <div className="flex gap-2">
          <Input
            placeholder="Add a new goal..."
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
            className="flex-1"
          />
          <Button
            onClick={handleAddGoal}
            disabled={!newGoalTitle.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!canAddGoal && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Complete a goal to add a new one
        </p>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            Completed ({completedGoals.length})
          </p>
          <div className="space-y-2">{completedGoals.map(renderGoalItem)}</div>
        </div>
      )}
    </div>
  );
};

export default GoalList;
