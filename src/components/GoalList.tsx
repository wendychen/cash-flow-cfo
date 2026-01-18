import { useState } from "react";
import { Goal } from "@/types/goal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Target, Calendar, GripVertical, Wand2 } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface GoalListProps {
  goals: Goal[];
  allGoals: Goal[];
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onAddGoal: (title: string, deadline: string) => void;
  onReorderGoals: (goals: Goal[]) => void;
}

interface SortableGoalItemProps {
  goal: Goal;
  isEditing: boolean;
  displayTitle: string;
  displayDeadline: string;
  countdown: { days: number; label: string; color: string } | null;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onFieldChange: (id: string, field: "title" | "deadline", value: string) => void;
  onFieldBlur: (id: string, field: "title" | "deadline") => void;
  onToggleMagicWand: (id: string) => void;
}

const SortableGoalItem = ({
  goal,
  isEditing,
  displayTitle,
  displayDeadline,
  countdown,
  onUpdateGoal,
  onFieldChange,
  onFieldBlur,
  onToggleMagicWand,
}: SortableGoalItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${
        goal.completed
          ? "bg-muted/50 border-muted"
          : goal.isMagicWand
          ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-400/50 ring-1 ring-amber-400/30"
          : "bg-card border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={goal.completed}
          onCheckedChange={(checked) =>
            onUpdateGoal(goal.id, { completed: checked === true })
          }
          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
        <Input
          value={displayTitle}
          onChange={(e) => onFieldChange(goal.id, "title", e.target.value)}
          onBlur={() => onFieldBlur(goal.id, "title")}
          className={`flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 ${
            goal.completed ? "line-through text-muted-foreground" : ""
          } ${goal.isMagicWand ? "font-semibold" : ""}`}
          placeholder="Enter goal..."
        />
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${
            goal.isMagicWand
              ? "text-amber-500 hover:text-amber-600"
              : "text-muted-foreground hover:text-amber-500"
          }`}
          onClick={() => onToggleMagicWand(goal.id)}
          title={goal.isMagicWand ? "Remove priority" : "Set as top priority"}
        >
          <Wand2
            className={`h-4 w-4 ${goal.isMagicWand ? "fill-amber-500" : ""}`}
          />
        </Button>
      </div>
      <div className="flex items-center gap-2 ml-10">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="date"
          value={displayDeadline}
          onChange={(e) => onFieldChange(goal.id, "deadline", e.target.value)}
          onBlur={() => onFieldBlur(goal.id, "deadline")}
          className="h-7 text-xs border-dashed bg-transparent w-32"
          placeholder="Set deadline"
        />
        {countdown && !goal.completed && (
          <span className={`text-xs font-medium ${countdown.color}`}>
            {countdown.label === "today" ? (
              "Due today!"
            ) : countdown.label === "overdue" ? (
              `${countdown.days}d overdue`
            ) : (
              `${countdown.days}d left`
            )}
          </span>
        )}
      </div>
    </div>
  );
};

const GoalList = ({
  goals,
  allGoals,
  onUpdateGoal,
  onAddGoal,
  onReorderGoals,
}: GoalListProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [editingGoals, setEditingGoals] = useState<
    Record<string, { title: string; deadline: string }>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const canAddGoal = activeGoals.length < 10;

  const getCountdown = (
    deadline: string
  ): { days: number; label: string; color: string } | null => {
    if (!deadline) return null;
    const deadlineDate = parseISO(deadline);
    if (!isValid(deadlineDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = differenceInDays(deadlineDate, today);

    if (days < 0) {
      return { days: Math.abs(days), label: "overdue", color: "text-red-500" };
    } else if (days === 0) {
      return { days: 0, label: "today", color: "text-orange-500" };
    } else if (days <= 7) {
      return { days, label: "days left", color: "text-orange-500" };
    } else if (days <= 30) {
      return { days, label: "days left", color: "text-yellow-500" };
    } else {
      return { days, label: "days left", color: "text-muted-foreground" };
    }
  };

  const handleAddGoal = () => {
    if (newGoalTitle.trim() && canAddGoal) {
      onAddGoal(newGoalTitle.trim(), newGoalDeadline);
      setNewGoalTitle("");
      setNewGoalDeadline("");
    }
  };

  const handleFieldChange = (
    id: string,
    field: "title" | "deadline",
    value: string
  ) => {
    setEditingGoals((prev) => ({
      ...prev,
      [id]: {
        title:
          field === "title"
            ? value
            : prev[id]?.title ?? goals.find((g) => g.id === id)?.title ?? "",
        deadline:
          field === "deadline"
            ? value
            : prev[id]?.deadline ??
              goals.find((g) => g.id === id)?.deadline ??
              "",
      },
    }));
  };

  const handleFieldBlur = (id: string, field: "title" | "deadline") => {
    const editing = editingGoals[id];
    if (!editing) return;

    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    if (field === "title" && editing.title !== undefined && editing.title.trim()) {
      onUpdateGoal(id, { title: editing.title.trim() });
    }
    if (field === "deadline" && editing.deadline !== undefined) {
      onUpdateGoal(id, { deadline: editing.deadline });
    }

    setEditingGoals((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleToggleMagicWand = (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    // If this goal is already magic wand, turn it off
    if (goal.isMagicWand) {
      onUpdateGoal(id, { isMagicWand: false });
    } else {
      // Turn off magic wand for all other goals, turn on for this one
      allGoals.forEach((g) => {
        if (g.id === id) {
          onUpdateGoal(g.id, { isMagicWand: true });
        } else if (g.isMagicWand) {
          onUpdateGoal(g.id, { isMagicWand: false });
        }
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
      const newIndex = activeGoals.findIndex((g) => g.id === over.id);

      const reorderedActive = arrayMove(activeGoals, oldIndex, newIndex);

      // Rebuild the full goals array with reordered active goals + completed goals
      const newGoals = [...reorderedActive, ...completedGoals];

      // Also include goals without titles that weren't shown
      const goalsWithoutTitle = allGoals.filter((g) => !g.title);
      onReorderGoals([...newGoals, ...goalsWithoutTitle]);
    }
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

      {/* Active goals with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeGoals.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {activeGoals.map((goal) => {
              const isEditing = editingGoals[goal.id] !== undefined;
              const displayTitle = isEditing
                ? editingGoals[goal.id].title
                : goal.title;
              const displayDeadline = isEditing
                ? editingGoals[goal.id].deadline
                : goal.deadline;
              const countdown = getCountdown(goal.deadline);

              return (
                <SortableGoalItem
                  key={goal.id}
                  goal={goal}
                  isEditing={isEditing}
                  displayTitle={displayTitle}
                  displayDeadline={displayDeadline}
                  countdown={countdown}
                  onUpdateGoal={onUpdateGoal}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                  onToggleMagicWand={handleToggleMagicWand}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add goal form */}
      {canAddGoal && (
        <div className="flex flex-col gap-2">
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
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Deadline"
              value={newGoalDeadline}
              onChange={(e) => setNewGoalDeadline(e.target.value)}
              className="w-40 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              Optional deadline
            </span>
          </div>
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
          <div className="space-y-2">
            {completedGoals.map((goal) => {
              const isEditing = editingGoals[goal.id] !== undefined;
              const displayTitle = isEditing
                ? editingGoals[goal.id].title
                : goal.title;
              const displayDeadline = isEditing
                ? editingGoals[goal.id].deadline
                : goal.deadline;

              return (
                <div
                  key={goal.id}
                  className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/50 border-muted"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4" /> {/* Spacer for alignment */}
                    <Checkbox
                      checked={goal.completed}
                      onCheckedChange={(checked) =>
                        onUpdateGoal(goal.id, { completed: checked === true })
                      }
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Input
                      value={displayTitle}
                      onChange={(e) =>
                        handleFieldChange(goal.id, "title", e.target.value)
                      }
                      onBlur={() => handleFieldBlur(goal.id, "title")}
                      className="flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0 line-through text-muted-foreground"
                      placeholder="Enter goal..."
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-10">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={displayDeadline}
                      onChange={(e) =>
                        handleFieldChange(goal.id, "deadline", e.target.value)
                      }
                      onBlur={() => handleFieldBlur(goal.id, "deadline")}
                      className="h-7 text-xs border-dashed bg-transparent w-32"
                      placeholder="Set deadline"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalList;