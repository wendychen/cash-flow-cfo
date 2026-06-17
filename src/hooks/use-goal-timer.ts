import { useEffect, useMemo, useState } from 'react';
import type { Goal } from '@/types/goal';
import {
  computeGoalCountdown,
  getGoalTimerTarget,
  type GoalCountdown,
  type GoalTimerTarget,
} from '@/lib/goalTimer';

export function useGoalTimer(goal: Goal, enabled = true): {
  target: GoalTimerTarget | null;
  countdown: GoalCountdown | null;
} {
  const target = useMemo(
    () => (enabled && !goal.completed ? getGoalTimerTarget(goal) : null),
    [goal, enabled]
  );

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!target) return;

    const tick = () => setNow(new Date());
    const countdown = computeGoalCountdown(target.date, new Date());
    const ms = countdown && !countdown.isOverdue && countdown.days === 0 ? 1000 : 60_000;

    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [target?.date]);

  const countdown = useMemo(
    () => (target ? computeGoalCountdown(target.date, now) : null),
    [target, now]
  );

  return { target, countdown };
}