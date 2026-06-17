import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Flag, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Goal } from '@/types/goal';
import { MAX_MILESTONES_PER_GOAL } from '@/types/goalMilestone';
import {
  getMilestoneProgress,
  getMilestoneTimelinePoints,
  getNextMilestone,
  normalizeGoalMilestones,
  sortMilestonesByDate,
  toggleMilestoneCompletion,
} from '@/lib/goalMilestones';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface GoalMilestoneSectionProps {
  goal: Goal;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
}

function formatMilestoneDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

export default function GoalMilestoneSection({
  goal,
  onUpdateGoal,
}: GoalMilestoneSectionProps) {
  const { t } = useI18n();
  const milestones = normalizeGoalMilestones(goal.milestones);
  const sorted = sortMilestonesByDate(milestones);
  const progress = getMilestoneProgress(milestones);
  const nextMilestone = getNextMilestone(milestones);
  const timelineStart = goal.createdAt.split('T')[0];
  const timelineEnd = goal.deadline || timelineStart;
  const timelinePoints = getMilestoneTimelinePoints(sorted, timelineStart, timelineEnd);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(goal.deadline || '');

  const updateMilestones = (next: typeof milestones) => {
    onUpdateGoal(goal.id, { milestones: next });
  };

  const addMilestone = () => {
    if (!newTitle.trim() || !newDate || milestones.length >= MAX_MILESTONES_PER_GOAL) return;
    updateMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        targetDate: newDate,
        completed: false,
      },
    ]);
    setNewTitle('');
  };

  const deleteMilestone = (id: string) => {
    updateMilestones(milestones.filter((m) => m.id !== id));
  };

  const updateMilestoneField = (
    id: string,
    field: 'title' | 'targetDate' | 'note',
    value: string
  ) => {
    updateMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
        <Flag className="h-4 w-4 text-indigo-500" />
        <span>
          {t('goals.milestones')} ({progress.completed}/{progress.total})
        </span>
        {progress.total > 0 && (
          <Badge variant="outline" className="text-xs tabular-nums">
            {progress.percent}%
          </Badge>
        )}
      </div>

      {timelinePoints.length > 0 && goal.deadline && (
        <div className="px-1">
          <div className="relative h-2 rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-500/30"
              style={{ width: `${progress.percent}%` }}
            />
            {timelinePoints.map(({ milestone, positionPercent }) => {
              const isNext = nextMilestone?.id === milestone.id;
              return (
                <div
                  key={milestone.id}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background',
                    isNext ? 'w-3.5 h-3.5 ring-2 ring-amber-400 ring-offset-1' : 'w-2.5 h-2.5',
                    milestone.completed
                      ? 'bg-indigo-600'
                      : isNext
                      ? 'bg-amber-500'
                      : 'bg-indigo-300 dark:bg-indigo-700'
                  )}
                  style={{ left: `${positionPercent}%` }}
                  title={`${milestone.title} — ${formatMilestoneDate(milestone.targetDate)}${isNext ? ' (next)' : ''}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{formatMilestoneDate(timelineStart)}</span>
            <span>{formatMilestoneDate(timelineEnd)}</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {sorted.map((milestone) => {
          const isNext = nextMilestone?.id === milestone.id;
          return (
          <div
            key={milestone.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-md border bg-muted/30',
              milestone.completed && 'opacity-70',
              isNext && 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
            )}
          >
            <Checkbox
              checked={milestone.completed}
              onCheckedChange={() =>
                updateMilestones(toggleMilestoneCompletion(milestones, milestone.id))
              }
              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <Input
              value={milestone.title}
              onChange={(e) => updateMilestoneField(milestone.id, 'title', e.target.value)}
              className={cn(
                'h-7 text-sm flex-1 border-0 bg-transparent',
                milestone.completed && 'line-through text-muted-foreground'
              )}
            />
            <Input
              type="date"
              value={milestone.targetDate}
              onChange={(e) => updateMilestoneField(milestone.id, 'targetDate', e.target.value)}
              className="h-7 text-xs w-32 border-dashed bg-transparent"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMilestone(milestone.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
        })}
      </div>

      {milestones.length < MAX_MILESTONES_PER_GOAL && (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Milestone title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            className="h-8 text-sm flex-1 min-w-[140px]"
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
          <Button
            size="sm"
            onClick={addMilestone}
            disabled={!newTitle.trim() || !newDate}
            className="h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('goals.addMilestone')}
          </Button>
        </div>
      )}
    </div>
  );
}