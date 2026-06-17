import { FinanceStateV2 } from '@/stores/finance/financeStore';
import { buildExportPayload } from './exportImport';

export const AUTO_BACKUP_STORAGE_KEY = 'cash-flow-cfo-auto-backups';
export const AUTO_BACKUP_SCHEDULE_KEY = 'cash-flow-cfo-auto-backup-last-run';
export const MAX_AUTO_BACKUPS = 5;
/** Minimum interval between scheduled backups (24 hours) */
export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface AutoBackupEntry {
  savedAt: string;
  data: FinanceStateV2;
}

export function listAutoBackups(): AutoBackupEntry[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLatestAutoBackup(): AutoBackupEntry | null {
  const backups = listAutoBackups();
  return backups.length > 0 ? backups[0] : null;
}

function persistBackups(backups: AutoBackupEntry[]): void {
  localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, JSON.stringify(backups.slice(0, MAX_AUTO_BACKUPS)));
}

/**
 * Append a snapshot to the local auto-backup ring buffer (newest first).
 */
export function saveAutoBackup(state: FinanceStateV2, savedAt = new Date()): AutoBackupEntry {
  const entry: AutoBackupEntry = {
    savedAt: savedAt.toISOString(),
    data: buildExportPayload(state).data,
  };

  const existing = listAutoBackups();
  const last = existing[0];
  if (last && JSON.stringify(last.data) === JSON.stringify(entry.data)) {
    return last;
  }

  const updated = [entry, ...existing].slice(0, MAX_AUTO_BACKUPS);
  persistBackups(updated);
  return entry;
}

export function shouldRunScheduledBackup(now = Date.now()): boolean {
  const raw = localStorage.getItem(AUTO_BACKUP_SCHEDULE_KEY);
  if (!raw) return true;
  const last = parseInt(raw, 10);
  if (Number.isNaN(last)) return true;
  return now - last >= AUTO_BACKUP_INTERVAL_MS;
}

export function markScheduledBackupRun(now = Date.now()): void {
  localStorage.setItem(AUTO_BACKUP_SCHEDULE_KEY, String(now));
}

export function clearAutoBackups(): void {
  localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY);
  localStorage.removeItem(AUTO_BACKUP_SCHEDULE_KEY);
}