import { useState } from "react";
import { Goal, Ideation } from "@/types/goal";
import { TaskNode, TaskType } from "@/types/task";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/use-currency";
import { EXPENSE_CATEGORIES, ExpenseCategory } from "@/types/expenseCategory";
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
  Sparkles,
  UtensilsCrossed,
  Users,
  Package,
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
import TaskTreeSection from "./TaskTreeSection";

const getCategoryIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    UtensilsCrossed,
    Sparkles,
    Users,
    Package,
  };
  return iconMap[iconName] || Package;
};

interface GoalListProps {
  goals: Goal[];
  allGoals: Goal[];
  tasks: TaskNode[];
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onAddGoal: (title: string, deadline: string) => void;
  onDeleteGoal: (id: string) => void;
  onReorderGoals: (goals: Goal[]) => void;
  onAddTask: (
    goalId: string,
    parentId: string | null,
    taskType: TaskType,
    data: { title: string; cost: number; timeCost: string; deadline: string }
  ) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskNode>) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (reordered: TaskNode[]) => void;
  onMoveTask: (taskId: string, newParentId: string | null) => void;
}

interface SortableIdeationItemProps {
  idea: Ideation;
  ideations: Ideation[];
  onUpdateGoal: (goalId: string, updates: Partial<Omit<Goal, "id">>) => void;
  onDelete: (ideaId: string) => void;
  goalId: string;
}

const SortableIdeationItem = ({
  idea,
  ideations,
  onUpdateGoal,
  onDelete,
  goalId,
}: SortableIdeationItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded border bg-muted/30"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Lightbulb className="h-3 w-3 text-yellow-500" />
      <Input
        value={idea.content}
        onChange={(e) => {
          const updated = ideations.map((i) =>
            i.id === idea.id ? { ...i, content: e.target.value } : i
          );
          onUpdateGoal(goalId, { ideations: updated });
        }}
        className="flex-1 h-6 text-sm border-0 bg-transparent px-1 focus-visible:ring-1"
        placeholder="Idea..."
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-red-500"
        onClick={() => onDelete(idea.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

interface SortableUrlItemProps {
  url: string;
  index: number;
  urlPack: string[];
  onUpdateGoal: (goalId: string, updates: Partial<Omit<Goal, "id">>) => void;
  onDelete: (index: number) => void;
  goalId: string;
}

const SortableUrlItem = ({
  url,
  index,
  urlPack,
  onUpdateGoal,
  onDelete,
  goalId,
}: SortableUrlItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `url-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-1.5 rounded bg-muted/30 group"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <Input
        value={url}
        onChange={(e) => {
          const updated = [...urlPack];
          updated[index] = e.target.value;
          onUpdateGoal(goalId, { urlPack: updated });
        }}
        className="flex-1 h-6 text-xs"
        placeholder="URL..."
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => window.open(url, "_blank")}
        title="Open URL"
      >
        <ExternalLink className="h-3 w-3 text-blue-500" />
      </Button>
      <button
        onClick={() => onDelete(index)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
      </button>
    </div>
  );
};

interface SortableGoalItemProps {
  goal: Goal;
  tasks: TaskNode[];
  isExpanded: boolean;
  displayTitle: string;
  displayDeadline: string;
  countdown: { days: number; label: string; color: string } | null;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, "id">>) => void;
  onDeleteGoal: (id: string) => void;
  onFieldChange: (
    id: string,
    field: "title" | "deadline",
    value: string
  ) => void;
  onFieldBlur: (id: string, field: "title" | "deadline") => void;
  onToggleMagicWand: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAddTask: GoalListProps["onAddTask"];
  onUpdateTask: GoalListProps["onUpdateTask"];
  onDeleteTask: GoalListProps["onDeleteTask"];
  onReorderTasks: GoalListProps["onReorderTasks"];
  onMoveTask: GoalListProps["onMoveTask"];
}

const SortableGoalItem = ({
  goal,
  tasks,
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
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onMoveTask,
}: SortableGoalItemProps) => {
  const { format } = useCurrency();
  const [newIdeation, setNewIdeation] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const ideations = goal.ideations || [];
  const urlPack = goal.urlPack || [];
  const constraint = goal.constraint || "";

  const goalTasks = tasks.filter((t) => t.goalId === goal.id);
  const preTasks = goalTasks.filter((t) => t.taskType === "pre");
  const postTasks = goalTasks.filter((t) => t.taskType === "post");
  const dreams = goalTasks.filter((t) => t.taskType === "dream");
  const totalCost = goalTasks.reduce((sum, t) => sum + t.cost, 0);
  const totalTaskCount = preTasks.length + postTasks.length;
  const completedTaskCount =
    preTasks.filter((t) => t.completed).length +
    postTasks.filter((t) => t.completed).length;

  const addIdeation = () => {
    if (!newIdeation.trim() || ideations.length >= 20) return;
    const ideation: Ideation = {
      id: crypto.randomUUID(),
      content: newIdeation.trim(),
      createdAt: new Date().toISOString(),
    };
    onUpdateGoal(goal.id, { ideations: [...ideations, ideation] });
    setNewIdeation("");
  };

  const deleteIdeation = (ideaId: string) => {
    onUpdateGoal(goal.id, {
      ideations: ideations.filter((i) => i.id !== ideaId),
    });
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try {
      new URL(url);
      onUpdateGoal(goal.id, { urlPack: [...urlPack, url] });
      setNewUrl("");
    } catch {
      return;
    }
  };

  const deleteUrl = (index: number) => {
    onUpdateGoal(goal.id, {
      urlPack: urlPack.filter((_, i) => i !== index),
    });
  };

  const openAllUrls = () => {
    urlPack.forEach((url) => window.open(url, "_blank"));
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
        <button
          onClick={() => onToggleExpand(goal.id)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
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

      <div className="flex items-center gap-2 ml-14 flex-wrap">
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
            {countdown.label === "today"
              ? "Due today!"
              : countdown.label === "overdue"
              ? `${countdown.days}d overdue`
              : `${countdown.days}d left`}
          </span>
        )}
        <Select
          value={goal.category}
          onValueChange={(value) =>
            onUpdateGoal(goal.id, { category: value as ExpenseCategory })
          }
        >
          <SelectTrigger className="h-7 w-32 text-xs border-dashed">
            <SelectValue>
              {(() => {
                const categoryData = EXPENSE_CATEGORIES[goal.category];
                const IconComponent = getCategoryIcon(categoryData.icon);
                return (
                  <div className="flex items-center gap-1">
                    <IconComponent
                      className={`h-3 w-3 ${categoryData.color}`}
                    />
                    <span>{categoryData.label}</span>
                  </div>
                );
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, data]) => {
              const IconComponent = getCategoryIcon(data.icon);
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-3.5 w-3.5 ${data.color}`} />
                    <span>{data.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {totalTaskCount > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <ListTodo className="h-3 w-3" />
            {completedTaskCount}/{totalTaskCount}
          </Badge>
        )}
        {totalCost > 0 && (
          <Badge
            variant="outline"
            className="text-xs gap-1 text-emerald-600"
          >
            <DollarSign className="h-3 w-3" />
            {format(totalCost)}
          </Badge>
        )}
        {(goal.budget || 0) > 0 && (
          <Badge variant="outline" className="text-xs gap-1 text-blue-600">
            Budget: {format(goal.budget)}
          </Badge>
        )}
        {dreams.length > 0 && (
          <Badge variant="outline" className="text-xs gap-1 text-teal-600">
            <Sparkles className="h-3 w-3" />
            {dreams.length} dreams
          </Badge>
        )}
      </div>

      {isExpanded && (
        <div className="ml-14 mt-2 space-y-4">
          <TaskTreeSection
            goalId={goal.id}
            taskType="pre"
            tasks={tasks}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onReorderTasks={onReorderTasks}
            onMoveTask={onMoveTask}
            goalTitle={goal.title}
            goalCategory={goal.category}
          />

          <TaskTreeSection
            goalId={goal.id}
            taskType="post"
            tasks={tasks}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onReorderTasks={onReorderTasks}
            onMoveTask={onMoveTask}
            goalTitle={goal.title}
            goalCategory={goal.category}
          />

          <TaskTreeSection
            goalId={goal.id}
            taskType="dream"
            tasks={tasks}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onReorderTasks={onReorderTasks}
            onMoveTask={onMoveTask}
            goalTitle={goal.title}
            goalCategory={goal.category}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span>Ideation ({ideations.length}/20)</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  const oldIndex = ideations.findIndex(
                    (i) => i.id === active.id
                  );
                  const newIndex = ideations.findIndex(
                    (i) => i.id === over.id
                  );
                  onUpdateGoal(goal.id, {
                    ideations: arrayMove(ideations, oldIndex, newIndex),
                  });
                }
              }}
            >
              <SortableContext
                items={ideations.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {ideations.map((idea) => (
                    <SortableIdeationItem
                      key={idea.id}
                      idea={idea}
                      ideations={ideations}
                      onUpdateGoal={onUpdateGoal}
                      onDelete={deleteIdeation}
                      goalId={goal.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {ideations.length < 20 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add an idea..."
                  value={newIdeation}
                  onChange={(e) => setNewIdeation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIdeation()}
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={addIdeation}
                  disabled={!newIdeation.trim()}
                  className="h-8"
                >
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
              value={constraint}
              onChange={(e) =>
                onUpdateGoal(goal.id, { constraint: e.target.value })
              }
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link className="h-4 w-4 text-blue-500" />
                <span>URL Pack ({urlPack.length})</span>
              </div>
              {urlPack.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAllUrls}
                  className="h-7 text-xs gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open All
                </Button>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  const oldIndex = parseInt(
                    active.id.toString().replace("url-", "")
                  );
                  const newIndex = parseInt(
                    over.id.toString().replace("url-", "")
                  );
                  onUpdateGoal(goal.id, {
                    urlPack: arrayMove(urlPack, oldIndex, newIndex),
                  });
                }
              }}
            >
              <SortableContext
                items={urlPack.map((_, index) => `url-${index}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {urlPack.map((url, index) => (
                    <SortableUrlItem
                      key={`url-${index}`}
                      url={url}
                      index={index}
                      urlPack={urlPack}
                      onUpdateGoal={onUpdateGoal}
                      onDelete={deleteUrl}
                      goalId={goal.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="flex gap-2">
              <Input
                placeholder="Add URL..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUrl()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={addUrl}
                disabled={!newUrl.trim()}
                className="h-8"
              >
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
  tasks,
  onUpdateGoal,
  onAddGoal,
  onDeleteGoal,
  onReorderGoals,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onMoveTask,
}: GoalListProps) => {
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [editingGoals, setEditingGoals] = useState<
    Record<string, { title: string; deadline: string }>
  >({});
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [isGoalsOpen, setIsGoalsOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
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
      return {
        days: Math.abs(days),
        label: "overdue",
        color: "text-red-500",
      };
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
    if (newGoalTitle.trim()) {
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
            : prev[id]?.title ??
              goals.find((g) => g.id === id)?.title ??
              "",
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

    if (
      field === "title" &&
      editing.title !== undefined &&
      editing.title.trim()
    ) {
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
    <Collapsible
      open={isGoalsOpen}
      onOpenChange={setIsGoalsOpen}
      className="space-y-4"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-foreground">Goals</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeGoals.length} active
            </span>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                isGoalsOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
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
                    tasks={tasks}
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
                    onAddTask={onAddTask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onReorderTasks={onReorderTasks}
                    onMoveTask={onMoveTask}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

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
                          onUpdateGoal(goal.id, {
                            completed: checked === true,
                          })
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
                          handleFieldChange(
                            goal.id,
                            "deadline",
                            e.target.value
                          )
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
      </CollapsibleContent>
    </Collapsible>
  );
};

export default GoalList;
