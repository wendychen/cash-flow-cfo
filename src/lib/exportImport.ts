import { FinanceStateV2 } from '@/stores/finance/financeStore';

/**
 * Data portability utilities for Cash Flow CFO.
 * Supports clean JSON export/import for backup, transfer, and restore.
 */

export interface ExportPayload {
  meta: {
    app: 'cash-flow-cfo';
    schemaVersion: 2;
    exportedAt: string;
    counts: Record<string, number>;
  };
  data: FinanceStateV2;
}

export type ExportMethod = 'picker' | 'download' | 'cancelled';

export interface ExportResult {
  filename: string;
  success: boolean;
  method: ExportMethod;
}

function triggerDownload(filename: string, content: string, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildExportFilename(date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `cash-flow-cfo-export-${dateStr}.json`;
}

export function buildExportPayload(state: FinanceStateV2, exportedAt = new Date()): ExportPayload {
  return {
    meta: {
      app: 'cash-flow-cfo',
      schemaVersion: 2,
      exportedAt: exportedAt.toISOString(),
      counts: {
        expenses: state.expenses?.length ?? 0,
        incomes: state.incomes?.length ?? 0,
        savings: state.savings?.length ?? 0,
        fixedExpenses: state.fixedExpenses?.length ?? 0,
        targets: state.targets?.length ?? 0,
        longTermFinGoal: state.longTermFinGoal ? 1 : 0,
        goals: state.goals?.length ?? 0,
        tasks: state.tasks?.length ?? 0,
      },
    },
    data: {
      version: 2,
      expenses: state.expenses ?? [],
      incomes: state.incomes ?? [],
      savings: state.savings ?? [],
      fixedExpenses: state.fixedExpenses ?? [],
      targets: state.targets ?? [],
      longTermFinGoal: state.longTermFinGoal ?? null,
      goals: state.goals ?? [],
      tasks: state.tasks ?? [],
    },
  };
}

export function serializeExportPayload(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function downloadJSON(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  triggerDownload(filename, json);
}

/**
 * Save export via native file picker when available, else trigger browser download.
 */
export async function saveFinanceExport(state: FinanceStateV2): Promise<ExportResult> {
  const filename = buildExportFilename();
  const payload = buildExportPayload(state);
  const json = serializeExportPayload(payload);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Cash Flow CFO Backup',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return { filename: handle.name, success: true, method: 'picker' };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { filename, success: false, method: 'cancelled' };
      }
      // Fall through to download on unsupported / unexpected errors
    }
  }

  downloadJSON(filename, payload);
  return { filename, success: true, method: 'download' };
}

/**
 * @deprecated Use saveFinanceExport for user-facing export (picker + fallback).
 */
export function exportFinanceData(state: FinanceStateV2): { filename: string; success: boolean } {
  const filename = buildExportFilename();
  const payload = buildExportPayload(state);
  downloadJSON(filename, payload);
  return { filename, success: true };
}

/**
 * Parses a JSON string (supports both wrapped ExportPayload and raw state shape).
 * Performs basic structural validation.
 */
export function parseImportJSON(
  jsonString: string
): { success: boolean; data?: FinanceStateV2; error?: string; meta?: ExportPayload['meta'] } {
  try {
    const parsed = JSON.parse(jsonString);

    let rawData: unknown;
    let meta: ExportPayload['meta'] | null = null;

    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'meta' in parsed) {
      rawData = (parsed as ExportPayload).data;
      meta = (parsed as ExportPayload).meta;
    } else if (parsed && typeof parsed === 'object' && (Array.isArray((parsed as FinanceStateV2).expenses) || Array.isArray((parsed as FinanceStateV2).goals))) {
      rawData = parsed;
    } else {
      return { success: false, error: 'Unrecognized file format. Expected Cash Flow CFO export JSON.' };
    }

    const raw = rawData as FinanceStateV2;

    if (!Array.isArray(raw.expenses) || !Array.isArray(raw.goals) || !Array.isArray(raw.tasks)) {
      return {
        success: false,
        error: 'Invalid data: missing required arrays (expenses, goals, tasks)',
      };
    }

    const cleaned: FinanceStateV2 = {
      version: 2,
      expenses: raw.expenses || [],
      incomes: raw.incomes || [],
      savings: raw.savings || [],
      fixedExpenses: raw.fixedExpenses || [],
      targets: raw.targets || [],
      longTermFinGoal: raw.longTermFinGoal ?? null,
      goals: raw.goals || [],
      tasks: raw.tasks || [],
    };

    return { success: true, data: cleaned, meta: meta ?? undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON file',
    };
  }
}