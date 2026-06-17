import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';

export interface GoalExportPayload {
  meta: {
    app: 'cash-flow-cfo';
    type: 'goal-bundle';
    schemaVersion: 1;
    exportedAt: string;
    goalTitle: string;
  };
  goal: Goal;
  tasks: TaskNode[];
}

export interface GoalImportResult {
  success: boolean;
  error?: string;
  payload?: GoalExportPayload;
}

export function buildGoalExportPayload(goal: Goal, tasks: TaskNode[]): GoalExportPayload {
  return {
    meta: {
      app: 'cash-flow-cfo',
      type: 'goal-bundle',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      goalTitle: goal.title,
    },
    goal,
    tasks: tasks.filter((t) => t.goalId === goal.id),
  };
}

export function buildGoalExportFilename(goal: Goal, date = new Date()): string {
  const slug = goal.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'goal';
  const dateStr = date.toISOString().split('T')[0];
  return `cash-flow-cfo-goal-${slug}-${dateStr}.json`;
}

export function parseGoalImportJSON(text: string): GoalImportResult {
  try {
    const parsed = JSON.parse(text) as GoalExportPayload;
    if (parsed?.meta?.app !== 'cash-flow-cfo' || parsed.meta.type !== 'goal-bundle') {
      return { success: false, error: 'Not a Cash Flow CFO goal bundle file.' };
    }
    if (!parsed.goal?.title) {
      return { success: false, error: 'Goal bundle is missing goal data.' };
    }
    if (!Array.isArray(parsed.tasks)) {
      return { success: false, error: 'Goal bundle is missing tasks array.' };
    }
    return { success: true, payload: parsed };
  } catch {
    return { success: false, error: 'Invalid JSON file.' };
  }
}

export function downloadGoalExport(payload: GoalExportPayload): string {
  const filename = buildGoalExportFilename(payload.goal);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}

/** Sort tasks so parents are created before children. */
export function sortTasksForImport(tasks: TaskNode[]): TaskNode[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const sorted: TaskNode[] = [];
  const visited = new Set<string>();

  const visit = (task: TaskNode) => {
    if (visited.has(task.id)) return;
    if (task.parentId && byId.has(task.parentId)) {
      visit(byId.get(task.parentId)!);
    }
    visited.add(task.id);
    sorted.push(task);
  };

  tasks.forEach(visit);
  return sorted;
}