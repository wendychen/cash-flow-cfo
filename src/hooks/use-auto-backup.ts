import { useEffect, useRef } from 'react';
import { useFinanceStore } from '@/stores/finance/financeStore';
import {
  saveAutoBackup,
  shouldRunScheduledBackup,
  markScheduledBackupRun,
} from '@/lib/autoBackup';

const DEBOUNCE_MS = 5000;

/**
 * Keeps a local ring buffer of recent finance snapshots.
 * - Debounced backup after data mutations
 * - Scheduled backup at most once per 24h
 * - Backup on tab close / refresh (beforeunload)
 */
export function useAutoBackup(enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const savings = useFinanceStore((s) => s.savings);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const targets = useFinanceStore((s) => s.targets);
  const longTermFinGoal = useFinanceStore((s) => s.longTermFinGoal);
  const goals = useFinanceStore((s) => s.goals);
  const tasks = useFinanceStore((s) => s.tasks);

  useEffect(() => {
    if (!enabled) return;

    const runBackup = (scheduled: boolean) => {
      const state = useFinanceStore.getState();
      const snapshot = {
        version: 2 as const,
        expenses: state.expenses,
        incomes: state.incomes,
        savings: state.savings,
        fixedExpenses: state.fixedExpenses,
        targets: state.targets,
        longTermFinGoal: state.longTermFinGoal,
        goals: state.goals,
        tasks: state.tasks,
      };

      if (scheduled && !shouldRunScheduledBackup()) return;

      saveAutoBackup(snapshot);
      if (scheduled) markScheduledBackupRun();
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runBackup(shouldRunScheduledBackup());
    }, DEBOUNCE_MS);

    const onBeforeUnload = () => runBackup(false);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, expenses, incomes, savings, fixedExpenses, targets, longTermFinGoal, goals, tasks]);
}