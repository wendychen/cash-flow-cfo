import { useState } from "react";
import { Goal, SubTask, Ideation } from "@/types/goal";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/use-currency";
import {
  Plus,
  Target,
  Calendar,
  GripVertical,
  Wand2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  Link,
  Lightbulb,
  Lock,
  ListTodo,
  DollarSign,
  Clock,
} from "lucide-react";
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
  onDeleteGoal: (id: string) => void;
  onReorderGoals: (goals: Goal[]) => void;
}

interface SortableGoalItemProps {
  goal: Goal;
  isEditing: boolean;
  isExpanded: boolean;
  displayTitle: string;
  displayDeadline: string;
  countdown: { days: number; label: string; color: string } | null;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onDeleteGoal: (id: string) => void;
  onFieldChange: (id: string, field: "title" | "deadline", value: string) => void;
  onFieldBlur: (id: string, field: "title" | "deadline") => void;
  onToggleMagicWand: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

const SortableGoalItem = ({
  goal,
  isEditing,
  isExpanded,
  displayTitle,
  displayDeadline,
  countdown,
  onUpdateGoal,
  onDeleteGoal,
  onFieldChange,
  onFieldBlur,
  onToggleMagicWand,
  onToggleExpand,
}: SortableGoalItemProps) => {
  const { format } = useCurrency();
  const [newSubTask, setNewSubTask] = useState({ action: "", cost: "", timeCost: "", deadline: "" });
  const [newIdeation, setNewIdeation] = useState("");
  const [newUrl, setNewUrl] = useState("");

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

  const addSubTask = () => {
    if (!newSubTask.action.trim() || goal.subTasks.length >= 10) return;
    const subTask: SubTask = {
      id: crypto.randomUUID(),
      action: newSubTask.action.trim(),
      cost: parseFloat(newSubTask.cost) || 0,
      timeCost: newSubTask.timeCost,
      deadline: newSubTask.deadline,
      isMagicWand: false,
      completed: false,
    };
    onUpdateGoal(goal.id, { subTasks: [...goal.subTasks, subTask] });
    setNewSubTask({ action: "", cost: "", timeCost: "", deadline: "" });
  };

  const updateSubTask = (taskId: string, updates: Partial<SubTask>) => {
    const updated = goal.subTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    if (updates.isMagicWand) {
      updated.forEach(t => { if (t.id !== taskId) t.isMagicWand = false; });
    }
    onUpdateGoal(goal.id, { subTasks: updated });
  };

  const deleteSubTask = (taskId: string) => {
    onUpdateGoal(goal.id, { subTasks: goal.subTasks.filter(t => t.id !== taskId) });
  };

  const addIdeation = () => {
    if (!newIdeation.trim() || goal.ideations.length >= 20) return;
    const ideation: Ideation = {
      id: crypto.randomUUID(),
      content: newIdeation.trim(),
      createdAt: new Date().toISOString(),
    };
    onUpdateGoal(goal.id, { ideations: [...goal.ideations, ideation] });
    setNewIdeation("");
  };

  const deleteIdeation = (ideaId: string) => {
    onUpdateGoal(goal.id, { ideations: goal.ideations.filter(i => i.id !== ideaId) });
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      new URL(url);
      onUpdateGoal(goal.id, { urlPack: [...goal.urlPack, url] });
      setNewUrl("");
    } catch {
      return;
    }
  };

  const deleteUrl = (index: number) => {
    onUpdateGoal(goal.id, { urlPack: goal.urlPack.filter((_, i) => i !== index) });
  };

  const openAllUrls = () => {
    goal.urlPack.forEach(url => window.open(url, "_blank"));
  };

  const magicWandTask = goal.subTasks.find(t => t.isMagicWand);
  const totalSubTaskCost = goal.subTasks.reduce((sum, t) => sum + t.cost, 0);

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
        <button onClick={() => onToggleExpand(goal.id)} className="text-muted-foreground hover:text-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-500"
          onClick={() => onDeleteGoal(goal.id)}
          title="Delete goal"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2 ml-14">
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
        {goal.subTasks.length > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <ListTodo className="h-3 w-3" />
            {goal.subTasks.filter(t => t.completed).length}/{goal.subTasks.length}
          </Badge>
        )}
        {totalSubTaskCost > 0 && (
          <Badge variant="outline" className="text-xs gap-1 text-emerald-600">
            <DollarSign className="h-3 w-3" />
            {format(totalSubTaskCost)}
          </Badge>
        )}
      </div>

      {isExpanded && (
        <div className="ml-14 mt-2 space-y-4">
          {magicWandTask && (
            <div className="p-2 bg-amber-500/10 rounded-md border border-amber-400/30">
              <div className="flex items-center gap-2 text-amber-600">
                <Wand2 className="h-4 w-4 fill-amber-500" />
                <span className="text-sm font-medium">Key Action: {magicWandTask.action}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ListTodo className="h-4 w-4 text-blue-500" />
              <span>Sub-tasks ({goal.subTasks.length}/10)</span>
            </div>
            {goal.subTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-2 p-2 rounded border ${task.isMagicWand ? "bg-amber-500/5 border-amber-400/30" : "bg-muted/30"}`}>
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => updateSubTask(task.id, { completed: checked === true })}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.action}</span>
                {task.cost > 0 && <Badge variant="outline" className="text-xs">{format(task.cost)}</Badge>}
                {task.timeCost && <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{task.timeCost}</Badge>}
                {task.deadline && <Badge variant="outline" className="text-xs">{task.deadline}</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${task.isMagicWand ? "text-amber-500" : "text-muted-foreground"}`}
                  onClick={() => updateSubTask(task.id, { isMagicWand: !task.isMagicWand })}
                >
                  <Wand2 className={`h-3 w-3 ${task.isMagicWand ? "fill-amber-500" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => deleteSubTask(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {goal.subTasks.length < 10 && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Action item..."
                  value={newSubTask.action}
                  onChange={(e) => setNewSubTask(prev => ({ ...prev, action: e.target.value }))}
                  className="flex-1 min-w-[150px] h-8 text-sm"
                />
                <Input
                  placeholder="$ Cost"
                  type="number"
                  value={newSubTask.cost}
                  onChange={(e) => setNewSubTask(prev => ({ ...prev, cost: e.target.value }))}
                  className="w-20 h-8 text-sm"
                />
                <Input
                  placeholder="Time"
                  value={newSubTask.timeCost}
                  onChange={(e) => setNewSubTask(prev => ({ ...prev, timeCost: e.target.value }))}
                  className="w-20 h-8 text-sm"
                />
                <Input
                  type="date"
                  value={newSubTask.deadline}
                  onChange={(e) => setNewSubTask(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-32 h-8 text-sm"
                />
                <Button size="sm" onClick={addSubTask} disabled={!newSubTask.action.trim()} className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span>Ideation ({goal.ideations.length}/20)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {goal.ideations.map(idea => (
                <Badge key={idea.id} variant="secondary" className="gap-1 group">
                  <span className="max-w-[200px] truncate">{idea.content}</span>
                  <button onClick={() => deleteIdeation(idea.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                  </button>
                </Badge>
              ))}
            </div>
            {goal.ideations.length < 20 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add an idea..."
                  value={newIdeation}
                  onChange={(e) => setNewIdeation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIdeation()}
                  className="flex-1 h-8 text-sm"
                />
                <Button size="sm" onClick={addIdeation} disabled={!newIdeation.trim()} className="h-8">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-red-500" />
              <span>Key Constraint</span>
            </div>
            <Textarea
              placeholder="What's the main blocker or constraint for this goal?"
              value={goal.constraint}
              onChange={(e) => onUpdateGoal(goal.id, { constraint: e.target.value })}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link className="h-4 w-4 text-purple-500" />
                <span>URL Pack ({goal.urlPack.length})</span>
              </div>
              {goal.urlPack.length > 0 && (
                <Button variant="outline" size="sm" onClick={openAllUrls} className="h-7 text-xs gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Open All
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {goal.urlPack.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 group">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-blue-500 hover:underline truncate">
                    {url}
                  </a>
                  <button onClick={() => deleteUrl(index)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add URL..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl()}
                className="flex-1 h-8 text-sm"
              />
              <Button size="sm" onClick={addUrl} disabled={!newUrl.trim()} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalList = ({
  goals,
  allGoals,
  onUpdateGoal,
  onAddGoal,
  onDeleteGoal,
  onReorderGoals,
}: GoalListProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [editingGoals, setEditingGoals] = useState<
    Record<string, { title: string; deadline: string }>
  >({});
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

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

  const toggleExpand = (id: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

    if (goal.isMagicWand) {
      onUpdateGoal(id, { isMagicWand: false });
    } else {
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
      const newGoals = [...reorderedActive, ...completedGoals];
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
                  isExpanded={expandedGoals.has(goal.id)}
                  displayTitle={displayTitle}
                  displayDeadline={displayDeadline}
                  countdown={countdown}
                  onUpdateGoal={onUpdateGoal}
                  onDeleteGoal={onDeleteGoal}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                  onToggleMagicWand={handleToggleMagicWand}
                  onToggleExpand={toggleExpand}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
                    <div className="w-4" />
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
