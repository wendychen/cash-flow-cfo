import { useMemo } from 'react';
import { TaskNode, TaskType } from '@/types/task';

export interface TreeNode {
  task: TaskNode;
  children: TreeNode[];
  depth: number;
}

export interface FlattenedItem {
  id: string;
  parentId: string | null;
  depth: number;
  task: TaskNode;
  childCount: number;
}

export function buildTree(
  tasks: TaskNode[],
  goalId: string,
  taskType: TaskType
): TreeNode[] {
  const filtered = tasks
    .filter(t => t.goalId === goalId && t.taskType === taskType)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const byParent = new Map<string, TaskNode[]>();
  for (const task of filtered) {
    const key = task.parentId ?? '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(task);
  }

  function build(parentId: string | null, depth: number): TreeNode[] {
    const key = parentId ?? '__root__';
    const children = byParent.get(key) || [];
    return children.map(task => ({
      task,
      children: build(task.id, depth + 1),
      depth,
    }));
  }

  return build(null, 0);
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

export function flattenTree(nodes: TreeNode[]): FlattenedItem[] {
  const result: FlattenedItem[] = [];

  function walk(nodes: TreeNode[]) {
    for (const node of nodes) {
      result.push({
        id: node.task.id,
        parentId: node.task.parentId,
        depth: node.depth,
        task: node.task,
        childCount: countDescendants(node),
      });
      walk(node.children);
    }
  }

  walk(nodes);
  return result;
}

export function useTaskTree(
  tasks: TaskNode[],
  goalId: string,
  taskType: TaskType
) {
  return useMemo(() => {
    const tree = buildTree(tasks, goalId, taskType);
    const flat = flattenTree(tree);
    const index = new Map<string, TaskNode>();
    for (const item of flat) {
      index.set(item.id, item.task);
    }
    return { tree, flat, index };
  }, [tasks, goalId, taskType]);
}

export function getDescendantIds(
  tasks: TaskNode[],
  taskId: string
): string[] {
  const ids: string[] = [];
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = tasks.filter(t => t.parentId === current);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }
  return ids;
}

export function getProjection(
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentWidth: number
): { depth: number; parentId: string | null } {
  const activeItem = items.find(i => i.id === activeId);
  if (!activeItem) return { depth: 0, parentId: null };

  const itemsWithoutActive = items.filter(i => i.id !== activeId);
  const overIndex = itemsWithoutActive.findIndex(i => i.id === overId);

  if (overIndex < 0) return { depth: 0, parentId: null };

  const previousItem = itemsWithoutActive[overIndex];
  const nextItem = itemsWithoutActive[overIndex + 1];

  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  const projectedDepth =
    activeItem.depth + Math.round(dragOffset / indentWidth);
  const depth = Math.min(maxDepth, Math.max(minDepth, projectedDepth));

  let parentId: string | null = null;
  if (depth > 0) {
    for (let i = overIndex; i >= 0; i--) {
      if (itemsWithoutActive[i].depth === depth - 1) {
        parentId = itemsWithoutActive[i].id;
        break;
      }
    }
  }

  return { depth, parentId };
}
