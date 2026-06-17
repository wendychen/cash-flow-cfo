import { CalendarClock, Flag, ListTodo, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { WeeklyFocusItem } from '@/lib/goalReachPlanner';

interface WeeklyFocusListProps {
  items: WeeklyFocusItem[];
  onOpenGoal?: (goalId: string) => void;
}

function daysLabel(
  daysUntil: number,
  t: (key: 'goalReach.weeklyFocus.dueToday' | 'goalReach.weeklyFocus.daysLeft', params?: Record<string, number>) => string
): string {
  if (daysUntil <= 0) return t('goalReach.weeklyFocus.dueToday');
  return t('goalReach.weeklyFocus.daysLeft', { count: daysUntil });
}

export default function WeeklyFocusList({ items, onOpenGoal }: WeeklyFocusListProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3" data-testid="weekly-focus-list">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-violet-600" />
        <h4 className="text-sm font-semibold text-foreground">{t('goalReach.weeklyFocus.title')}</h4>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('goalReach.weeklyFocus.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item.goalId}-${item.kind}-${item.title}-${index}`}>
              <button
                type="button"
                className={cn(
                  'w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  'hover:border-violet-300 hover:bg-violet-50/40 dark:hover:bg-violet-950/20',
                  item.isMagicWand && 'border-violet-300/60 bg-violet-50/30 dark:bg-violet-950/10'
                )}
                onClick={() => onOpenGoal?.(item.goalId)}
                disabled={!onOpenGoal}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    item.isMagicWand
                      ? 'bg-violet-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {item.isMagicWand ? <Wand2 className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.kind === 'task' ? (
                        <span className="inline-flex items-center gap-1">
                          <ListTodo className="h-3 w-3" />
                          {t('goalReach.weeklyFocus.task')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Flag className="h-3 w-3" />
                          {t('goalReach.weeklyFocus.milestone')}
                        </span>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.goalTitle} · {item.targetDate} · {daysLabel(item.daysUntil, t)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}