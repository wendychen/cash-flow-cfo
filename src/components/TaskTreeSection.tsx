import { useState, useRef, useMemo } from "react";
import { TaskNode, TaskType } from "@/types/task";
import { ExpenseCategory } from "@/types/expenseCategory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskTreeNode, { INDENT_WIDTH } from "./TaskTreeNode";
import {
  useTaskTree,
  getProjection,
  getDescendantIds,
  FlattenedItem,
} from "@/hooks/use-task-tree";
import { useCurrency } from "@/hooks/use-currency";

interface TaskTreeSectionProps {
  goalId: string;
  taskType: TaskType;
  tasks: TaskNode[];
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
  goalTitle?: string;
  goalCategory?: ExpenseCategory;
}

const sectionConfig: Record<
  TaskType,
  {
    label: string;
    icon: typeof ArrowLeft;
    iconColor: string;
    wandLabel: string;
  }
> = {
  pre: {
    label: "Pre-tasks",
    icon: ArrowLeft,
    iconColor: "text-blue-500",
    wandLabel: "Key Action",
  },
  post: {
    label: "Post-tasks",
    icon: ArrowRight,
    iconColor: "text-green-500",
    wandLabel: "Key Action",
  },
  dream: {
    label: "Post-Dreams",
    icon: Sparkles,
    iconColor: "text-teal-500",
    wandLabel: "Dream Priority",
  },
};

const TaskTreeSection = ({
  goalId,
  taskType,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onMoveTask,
  goalTitle,
  goalCategory,
}: TaskTreeSectionProps) => {
  const { format } = useCurrency();
  const [newTask, setNewTask] = useState({
    title: "",
    cost: "",
    timeCost: "",
    deadline: "",
  });
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);

  const { tree, flat } = useTaskTree(tasks, goalId, taskType);
  const config = sectionConfig[taskType];
  const Icon = config.icon;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleItems = useMemo(() => {
    const result: FlattenedItem[] = [];
    const collapsedAncestors = new Set<string>();

    for (const item of flat) {
      if (item.parentId && collapsedAncestors.has(item.parentId)) {
        collapsedAncestors.add(item.id);
        continue;
      }
      if (collapsedIds.has(item.id)) {
        collapsedAncestors.add(item.id);
      }
      result.push(item);
    }
    return result;
  }, [flat, collapsedIds]);

  const sortableIds = useMemo(
    () => visibleItems.map((i) => i.id),
    [visibleItems]
  );

  const projected = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(visibleItems, activeId, overId, offsetLeft, INDENT_WIDTH);
  }, [activeId, overId, offsetLeft, visibleItems]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleWand = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.isMagicWand) {
      onUpdateTask(taskId, { isMagicWand: false });
    } else {
      const siblings = tasks.filter(
        (t) =>
          t.goalId === goalId &&
          t.taskType === taskType &&
          t.parentId === task.parentId
      );
      for (const s of siblings) {
        if (s.isMagicWand && s.id !== taskId) {
          onUpdateTask(s.id, { isMagicWand: false });
        }
      }
      onUpdateTask(taskId, { isMagicWand: true });
    }
  };

  const handleAddRoot = () => {
    if (!newTask.title.trim()) return;
    onAddTask(goalId, null, taskType, {
      title: newTask.title.trim(),
      cost: parseFloat(newTask.cost) || 0,
      timeCost: newTask.timeCost,
      deadline: newTask.deadline,
    });
    setNewTask({ title: "", cost: "", timeCost: "", deadline: "" });
  };

  const handleAddSubtask = (parentId: string) => {
    setAddingSubtaskFor(parentId);
    setSubtaskTitle("");
    if (collapsedIds.has(parentId)) {
      toggleCollapse(parentId);
    }
  };

  const submitSubtask = () => {
    if (!subtaskTitle.trim() || !addingSubtaskFor) return;
    onAddTask(goalId, addingSubtaskFor, taskType, {
      title: subtaskTitle.trim(),
      cost: 0,
      timeCost: "",
      deadline: "",
    });
    setSubtaskTitle("");
    setAddingSubtaskFor(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOffsetLeft(0);
    setOverId(null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setOffsetLeft(event.delta.x);
  };

  const handleDragOver = (event: DragMoveEvent) => {
    const over = event.over;
    if (over) {
      setOverId(over.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activeId) {
      resetDragState();
      return;
    }

    const activeTaskId = active.id as string;
    const overTaskId = over.id as string;

    if (projected) {
      const descendantIds = getDescendantIds(tasks, activeTaskId);
      if (descendantIds.includes(projected.parentId ?? "")) {
        resetDragState();
        return;
      }

      const activeTask = tasks.find((t) => t.id === activeTaskId);
      if (!activeTask) {
        resetDragState();
        return;
      }

      const parentChanged = activeTask.parentId !== projected.parentId;
      if (parentChanged) {
        onMoveTask(activeTaskId, projected.parentId);
      }

      const cloned = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
      const sectionTasks = cloned.filter(
        (t) =>
          t.goalId === goalId &&
          t.taskType === taskType &&
          t.parentId === projected.parentId
      );

      const oldIdx = sectionTasks.findIndex((t) => t.id === activeTaskId);
      if (oldIdx < 0 && !parentChanged) {
        resetDragState();
        return;
      }

      if (parentChanged) {
        const siblings = tasks.filter(
          (t) =>
            t.goalId === goalId &&
            t.taskType === taskType &&
            t.parentId === projected.parentId &&
            t.id !== activeTaskId
        );
        const overIdx = siblings.findIndex((t) => t.id === overTaskId);
        const insertAt = overIdx >= 0 ? overIdx + 1 : siblings.length;
        const reordered = [...siblings];
        reordered.splice(insertAt, 0, {
          ...activeTask,
          parentId: projected.parentId,
        });
        const updated = reordered.map((t, i) => ({ ...t, sortOrder: i }));
        onReorderTasks(updated);
      } else {
        const overIdx = sectionTasks.findIndex((t) => t.id === overTaskId);
        if (overIdx >= 0 && oldIdx !== overIdx) {
          const reordered = arrayMove(sectionTasks, oldIdx, overIdx);
          const updated = reordered.map((t, i) => ({ ...t, sortOrder: i }));
          onReorderTasks(updated);
        }
      }
    }

    resetDragState();
  };

  const resetDragState = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  const magicWandTask = flat.find((f) => f.task.isMagicWand);
  const taskCount = flat.length;

  const activeTask = activeId
    ? visibleItems.find((i) => i.id === activeId)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
        <span>
          {config.label} ({taskCount})
        </span>
      </div>

      {taskType === "dream" && (
        <p className="text-xs text-muted-foreground">
          Goals to pursue after achieving this one
        </p>
      )}

      {magicWandTask && (
        <div
          className={`p-2 rounded-md border ${
            taskType === "dream"
              ? "bg-teal-500/10 border-teal-400/30"
              : "bg-amber-500/10 border-amber-400/30"
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              taskType === "dream" ? "text-teal-600" : "text-amber-600"
            }`}
          >
            <Wand2
              className={`h-4 w-4 ${
                taskType === "dream" ? "fill-teal-500" : "fill-amber-500"
              }`}
            />
            <span className="text-sm font-medium">
              {config.wandLabel}: {magicWandTask.task.title}
            </span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {visibleItems.map((item) => (
              <div key={item.id} className="group">
                <TaskTreeNode
                  task={item.task}
                  depth={item.depth}
                  hasChildren={item.childCount > 0}
                  isCollapsed={collapsedIds.has(item.id)}
                  onToggleCollapse={toggleCollapse}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                  onAddSubtask={handleAddSubtask}
                  onToggleWand={handleToggleWand}
                  format={format}
                  projectedDepth={
                    activeId === item.id && projected
                      ? projected.depth
                      : undefined
                  }
                  goalTitle={goalTitle}
                  goalCategory={goalCategory}
                />
                {addingSubtaskFor === item.id && (
                  <div
                    className="flex gap-2 mt-1"
                    style={{
                      paddingLeft: `${(item.depth + 1) * INDENT_WIDTH}px`,
                    }}
                  >
                    <Input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitSubtask();
                        if (e.key === "Escape") setAddingSubtaskFor(null);
                      }}
                      placeholder="Subtask..."
                      className="flex-1 h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={submitSubtask}
                      disabled={!subtaskTitle.trim()}
                      className="h-7"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80 bg-card border border-primary/30 rounded p-2 shadow-lg text-sm">
              {activeTask.task.title || "Untitled"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder={taskType === "dream" ? "Dream goal..." : "Action item..."}
          value={newTask.title}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, title: e.target.value }))
          }
          onKeyDown={(e) => e.key === "Enter" && handleAddRoot()}
          className="flex-1 min-w-[150px] h-8 text-sm"
        />
        <Input
          placeholder="$ Cost"
          type="number"
          value={newTask.cost}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, cost: e.target.value }))
          }
          className="w-20 h-8 text-sm"
        />
        <Input
          placeholder="Time"
          value={newTask.timeCost}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, timeCost: e.target.value }))
          }
          className="w-20 h-8 text-sm"
        />
        <Input
          type="date"
          value={newTask.deadline}
          onChange={(e) =>
            setNewTask((prev) => ({ ...prev, deadline: e.target.value }))
          }
          className="w-32 h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddRoot}
          disabled={!newTask.title.trim()}
          className="h-8"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default TaskTreeSection;
