import { describe, it, expect, beforeEach } from 'vitest';
import { reimportOldData } from './financeStore';
import { migratePersistedState } from './migration';
import {
  legacyLocalStorageV1,
  LEGACY_STORAGE_KEYS,
  expectedMigrationCounts,
} from '@/test/fixtures/legacyLocalStorage';

describe('legacy localStorage re-import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads all legacy per-domain keys and writes unified storage', () => {
    for (const key of LEGACY_STORAGE_KEYS) {
      const value = legacyLocalStorageV1[key as keyof typeof legacyLocalStorageV1];
      if (value !== undefined) {
        localStorage.setItem(key, value);
      }
    }

    const result = reimportOldData();
    expect(result.success).toBe(true);

    const stored = localStorage.getItem('cash-flow-cfo-storage');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    const state = parsed.state ?? parsed;

    expect(state.version).toBe(2);
    expect(state.goals).toHaveLength(expectedMigrationCounts.goals);
    expect(state.tasks).toHaveLength(expectedMigrationCounts.tasks);
    expect(state.expenses).toHaveLength(expectedMigrationCounts.expenses);
  });

  it('produces same task normalization as migratePersistedState', () => {
    const oldData = {
      version: 1,
      expenses: JSON.parse(legacyLocalStorageV1.expenses),
      incomes: [],
      savings: [],
      fixedExpenses: [],
      targets: [],
      goals: JSON.parse(legacyLocalStorageV1.goals),
      tasks: [],
    };

    const direct = migratePersistedState(oldData, 1);

    for (const key of LEGACY_STORAGE_KEYS) {
      const value = legacyLocalStorageV1[key as keyof typeof legacyLocalStorageV1];
      if (value !== undefined) {
        localStorage.setItem(key, value);
      }
    }
    reimportOldData();

    const stored = JSON.parse(localStorage.getItem('cash-flow-cfo-storage')!);
    const reimported = stored.state ?? stored;

    expect(reimported.tasks.length).toBe(direct.tasks.length);
    expect(reimported.goals.map((g: { id: string }) => g.id).sort()).toEqual(
      direct.goals.map((g) => g.id).sort()
    );
  });
});