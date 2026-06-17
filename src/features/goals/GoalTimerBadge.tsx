import { Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Goal } from '@/types/goal';
import { useGoalTimer } from '@/hooks/use-goal-timer';
import {
  countdownUrgencyClass,
  formatGoalCountdown,
} from '@/lib/goalTimer';
import { cn } from '@/lib/utils';

interface GoalTimerBadgeProps {
  goal: Goal;
  className?: string;
}

export default function GoalTimerBadge({ goal, className }: GoalTimerBadgeProps) {
  const { target, countdown } = useGoalTimer(goal);

  if (!target || !countdown || goal.completed) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs gap-1 tabular-nums font-medium',
        countdownUrgencyClass(countdown.urgency),
        className
      )}
      title={
        target.kind === 'milestone'
          ? `Next milestone: ${target.label}`
          : 'Goal deadline'
      }
    >
      <Timer className="h-3 w-3" />
      {formatGoalCountdown(countdown)}
      {target.kind === 'milestone' && (
        <span className="opacity-70 font-normal hidden sm:inline">
          · {target.label}
        </span>
      )}
    </Badge>
  );
}