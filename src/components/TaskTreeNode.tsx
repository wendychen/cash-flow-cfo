import { TaskNode } from "@/types/task";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  Wand2,
  Trash2,
  Link,
  DollarSign,
  Clock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const INDENT_WIDTH = 24;

interface TaskTreeNodeProps {
  task: TaskNode;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onUpdate: (taskId: string, updates: Partial<TaskNode>) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onToggleWand: (taskId: string) => void;
  format: (amount: number) => string;
  projectedDepth?: number;
}

const TaskTreeNode = ({
  task,
  depth,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  onUpdate,
  onDelete,
  onAddSubtask,
  onToggleWand,
  format,
  projectedDepth,
}: TaskTreeNodeProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: `${(projectedDepth ?? depth) * INDENT_WIDTH}px`,
  };

  const isDream = task.taskType === "dream";

  const wandColor = isDream
    ? {
        active: "text-teal-500",
        fill: "fill-teal-500",
        bg: "bg-teal-500/5 border-teal-400/30",
      }
    : {
        active: "text-amber-500",
        fill: "fill-amber-500",
        bg: "bg-amber-500/5 border-amber-400/30",
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-1.5 p-2 rounded border transition-colors ${
        task.isMagicWand ? wandColor.bg : "bg-muted/30 border-border/50"
      } ${isDragging ? "z-50 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>

        {hasChildren ? (
          <button
            onClick={() => onToggleCollapse(task.id)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="w-3.5 shrink-0" />
        )}

        {isDream ? (
          <Sparkles className="h-3.5 w-3.5 text-teal-400 shrink-0" />
        ) : (
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) =>
              onUpdate(task.id, { completed: checked === true })
            }
            className="data-[state=checked]:bg-blue-600 shrink-0"
          />
        )}

        {task.linkedExpenseId && (
          <Link
            className="h-3 w-3 text-blue-500 shrink-0"
            title="Synced with expense"
          />
        )}

        <Input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          className={`flex-1 h-7 text-sm border-0 bg-transparent px-1 focus-visible:ring-1 ${
            task.completed && !isDream
              ? "line-through text-muted-foreground"
              : ""
          }`}
          placeholder={isDream ? "Dream goal..." : "Action..."}
        />

        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 shrink-0 ${
            task.isMagicWand
              ? wandColor.active
              : "text-muted-foreground"
          }`}
          onClick={() => onToggleWand(task.id)}
        >
          <Wand2
            className={`h-3 w-3 ${task.isMagicWand ? wandColor.fill : ""}`}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
          onClick={() => onAddSubtask(task.id)}
          title="Add subtask"
        >
          <Plus className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div
        className="flex items-center gap-2 flex-wrap"
        style={{ marginLeft: `${28}px` }}
      >
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <Input
            type="number"
            value={task.cost || ""}
            onChange={(e) =>
              onUpdate(task.id, { cost: parseFloat(e.target.value) || 0 })
            }
            className="w-20 h-6 text-xs"
            placeholder="Cost"
          />
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <Input
            value={task.timeCost || ""}
            onChange={(e) => onUpdate(task.id, { timeCost: e.target.value })}
            className="w-20 h-6 text-xs"
            placeholder="Time"
          />
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <Input
            type="date"
            value={task.deadline || ""}
            onChange={(e) => onUpdate(task.id, { deadline: e.target.value })}
            className="w-32 h-6 text-xs"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskTreeNode;
export { INDENT_WIDTH };
