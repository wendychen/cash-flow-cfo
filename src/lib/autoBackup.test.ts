import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveAutoBackup,
  listAutoBackups,
  getLatestAutoBackup,
  clearAutoBackups,
  MAX_AUTO_BACKUPS,
  shouldRunScheduledBackup,
  markScheduledBackupRun,
  AUTO_BACKUP_SCHEDULE_KEY,
} from './autoBackup';
import { sampleV2State } from '@/test/fixtures/v2State';

describe('autoBackup', () => {
  beforeEach(() => {
    clearAutoBackups();
    localStorage.clear();
  });

  it('saves and retrieves the latest backup', () => {
    const entry = saveAutoBackup(sampleV2State);
    expect(entry.savedAt).toBeTruthy();
    expect(getLatestAutoBackup()?.data.goals).toHaveLength(1);
  });

  it('keeps at most MAX_AUTO_BACKUPS entries', () => {
    for (let i = 0; i < MAX_AUTO_BACKUPS + 2; i++) {
      saveAutoBackup({
        ...sampleV2State,
        expenses: [{ ...sampleV2State.expenses[0], id: `exp-${i}` }],
      });
    }
    expect(listAutoBackups()).toHaveLength(MAX_AUTO_BACKUPS);
  });

  it('skips duplicate consecutive snapshots', () => {
    saveAutoBackup(sampleV2State);
    saveAutoBackup(sampleV2State);
    expect(listAutoBackups()).toHaveLength(1);
  });

  it('respects scheduled backup interval', () => {
    vi.useFakeTimers();
    markScheduledBackupRun();
    expect(shouldRunScheduledBackup()).toBe(false);

    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(shouldRunScheduledBackup()).toBe(true);
    vi.useRealTimers();
    localStorage.removeItem(AUTO_BACKUP_SCHEDULE_KEY);
  });
});