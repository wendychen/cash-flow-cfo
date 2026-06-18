import { useMemo, useState } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';
import { useGoalCoachSettings } from '@/hooks/use-goal-coach-settings';
import GoalCoachSettingsPanel from '@/features/goals/GoalCoachSettingsPanel';
import { buildGoalCoachRequestBody } from '@/lib/goalCoachPayload';
import { requestGoalCoach } from '@/lib/goalCoachClient';
import {
  isCoachReadyForRequest,
  resolvedModelLabel,
  toProviderSettingsPayload,
} from '@/lib/goalCoachSettings';
import {
  applyGoalCoachSuggestion,
  milestoneKey,
  type GoalCoachApplySelection,
} from '@/lib/goalCoachApply';
import { isGoalDeadlineLocked } from '@/lib/goalDeadlineLock';
import type { GoalReachPlanSnapshot } from '@/lib/goalReachPlanner';
import type { GoalReachAiSuggestion } from '@/types/goalCoach';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';
import type { LongTermFinGoal } from '@/types/longTermFinGoal';

interface GoalCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  tasks: TaskNode[];
  plan: GoalReachPlanSnapshot;
  cashSummary: {
    savings: number;
    monthlySurplus: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
  };
  longTermFinGoal?: LongTermFinGoal | null;
  onUpdateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
}

export default function GoalCoachDialog({
  open,
  onOpenChange,
  goals,
  tasks,
  plan,
  cashSummary,
  longTermFinGoal = null,
  onUpdateGoal,
}: GoalCoachDialogProps) {
  const { t, locale } = useI18n();
  const { settings: coachSettings, setSettings: setCoachSettings } = useGoalCoachSettings();
  const activeCount = plan.activeGoalCount;

  const defaultPrompt = useMemo(
    () => t('goalReach.aiCoach.promptPlaceholder', { count: activeCount }),
    [t, activeCount]
  );

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeCashFlow, setIncludeCashFlow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<GoalReachAiSuggestion | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [applyReorder, setApplyReorder] = useState(true);
  const [deadlineShiftIds, setDeadlineShiftIds] = useState<string[]>([]);
  const [budgetAdjustmentIds, setBudgetAdjustmentIds] = useState<string[]>([]);
  const [newMilestoneKeys, setNewMilestoneKeys] = useState<string[]>([]);

  const unlockedDeadlineShifts = (next: GoalReachAiSuggestion) =>
    next.deadlineShifts?.filter((d) => {
      const goal = goals.find((g) => g.id === d.goalId);
      return goal && !isGoalDeadlineLocked(goal);
    }) ?? [];

  const resetSuggestionState = (next: GoalReachAiSuggestion) => {
    setSuggestion(next);
    setApplyReorder(!!next.reorder?.length);
    setDeadlineShiftIds(unlockedDeadlineShifts(next).map((d) => d.goalId));
    setBudgetAdjustmentIds(next.budgetAdjustments?.map((b) => b.goalId) ?? []);
    setNewMilestoneKeys(
      next.newMilestones?.map((m) => milestoneKey(m.goalId, m.title)) ?? []
    );
  };

  const handleGenerate = async () => {
    if (!isCoachReadyForRequest(coachSettings)) {
      setError(t('goalReach.aiCoach.settings.missingKey'));
      return;
    }

    if (hasGenerated && !window.confirm(t('goalReach.aiCoach.confirmSecondCall'))) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const body = {
        ...buildGoalCoachRequestBody({
          prompt,
          locale,
          includeConstraints,
          includeCashFlow,
          goals,
          tasks,
          plan,
          cashSummary,
          longTermFinGoal,
        }),
        providerSettings: toProviderSettingsPayload(coachSettings),
      };
      const result = await requestGoalCoach(body);
      if (!result.suggestion?.summary) {
        setError(t('goalReach.aiCoach.emptyResponse'));
        return;
      }
      resetSuggestionState(result.suggestion);
      setModel(result.model);
      setHasGenerated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes('api key') ||
        msg.toLowerCase().includes('missing_byok')
      ) {
        setError(t('goalReach.aiCoach.settings.missingKey'));
      } else if (msg.includes('503') || msg.toLowerCase().includes('not configured')) {
        setError(t('goalReach.aiCoach.unavailable'));
      } else {
        setError(t('goalReach.aiCoach.error', { error: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) return;
    const selection: GoalCoachApplySelection = {
      applyReorder,
      deadlineShiftIds,
      budgetAdjustmentIds,
      newMilestoneKeys,
    };
    applyGoalCoachSuggestion(suggestion, selection, goals, onUpdateGoal);
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (!suggestion?.summary) return;
    await navigator.clipboard.writeText(suggestion.summary);
  };

  const toggleId = (ids: string[], setIds: (v: string[]) => void, id: string) => {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const goalTitle = (id: string) =>
    goals.find((g) => g.id === id)?.title ?? plan.goalRows.find((r) => r.goalId === id)?.title ?? id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            {t('goalReach.aiCoach.title')}
          </DialogTitle>
          <DialogDescription>
            {model
              ? `${t('goalReach.aiCoach.model')}: ${model}`
              : `${t('goalReach.aiCoach.provider')}: ${t(`goalReach.aiCoach.settings.providers.${coachSettings.provider}`)} · ${resolvedModelLabel(coachSettings)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <GoalCoachSettingsPanel settings={coachSettings} onChange={setCoachSettings} />

          <div className="space-y-2">
            <Label htmlFor="coach-prompt">{t('goalReach.aiCoach.promptLabel')}</Label>
            <Textarea
              id="coach-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeConstraints}
                onCheckedChange={(v) => setIncludeConstraints(v === true)}
              />
              {t('goalReach.aiCoach.includeConstraints')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeCashFlow}
                onCheckedChange={(v) => setIncludeCashFlow(v === true)}
              />
              {t('goalReach.aiCoach.includeCashFlow')}
            </label>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {suggestion && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-sm whitespace-pre-wrap">{suggestion.summary}</p>

              {suggestion.reorder && suggestion.reorder.length > 0 && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={applyReorder}
                      onCheckedChange={(v) => setApplyReorder(v === true)}
                    />
                    {t('goalReach.aiCoach.sections.reorder')}
                  </label>
                  <ul className="text-xs text-muted-foreground ml-6 space-y-1">
                    {suggestion.reorder.map((r) => (
                      <li key={r.goalId}>
                        {goalTitle(r.goalId)} → {t('goalReach.aiCoach.priority', { n: r.newPriority })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unlockedDeadlineShifts(suggestion).map((d) => (
                <label key={d.goalId} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={deadlineShiftIds.includes(d.goalId)}
                    onCheckedChange={() => toggleId(deadlineShiftIds, setDeadlineShiftIds, d.goalId)}
                  />
                  <span>
                    <strong>{goalTitle(d.goalId)}</strong> → {d.newDeadline}
                    <span className="block text-xs text-muted-foreground">{d.reason}</span>
                  </span>
                </label>
              ))}

              {suggestion.budgetAdjustments?.map((b) => (
                <label key={b.goalId} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={budgetAdjustmentIds.includes(b.goalId)}
                    onCheckedChange={() =>
                      toggleId(budgetAdjustmentIds, setBudgetAdjustmentIds, b.goalId)
                    }
                  />
                  <span>
                    <strong>{goalTitle(b.goalId)}</strong> → {b.newBudget}
                    <span className="block text-xs text-muted-foreground">{b.reason}</span>
                  </span>
                </label>
              ))}

              {suggestion.newMilestones?.map((m) => {
                const key = milestoneKey(m.goalId, m.title);
                return (
                  <label key={key} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={newMilestoneKeys.includes(key)}
                      onCheckedChange={() => toggleId(newMilestoneKeys, setNewMilestoneKeys, key)}
                    />
                    <span>
                      <strong>{goalTitle(m.goalId)}</strong>: {m.title} ({m.targetDate})
                    </span>
                  </label>
                );
              })}

              {suggestion.weeklyFocus && suggestion.weeklyFocus.length > 0 && (
                <div>
                  <p className="text-sm font-medium">{t('goalReach.aiCoach.sections.weeklyFocus')}</p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc">
                    {suggestion.weeklyFocus.map((w, i) => (
                      <li key={`${w.goalId}-${i}`}>
                        {goalTitle(w.goalId)}: {w.taskOrMilestoneTitle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('goalReach.aiCoach.dismiss')}
          </Button>
          {suggestion && (
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {t('goalReach.aiCoach.copy')}
            </Button>
          )}
          <Button type="button" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? t('goalReach.aiCoach.thinking') : t('goalReach.aiCoach.generatePlan')}
          </Button>
          {suggestion && (
            <Button type="button" onClick={handleApply}>
              {t('goalReach.aiCoach.applySelected')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}