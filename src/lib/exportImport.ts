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

export function downloadJSON(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  triggerDownload(filename, json);
}

/**
 * Exports the full finance state as a timestamped JSON file.
 * Includes metadata for future compatibility.
 */
export function exportFinanceData(state: FinanceStateV2): { filename: string; success: boolean } {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `cash-flow-cfo-export-${dateStr}.json`;

  const payload: ExportPayload = {
    meta: {
      app: 'cash-flow-cfo',
      schemaVersion: 2,
      exportedAt: now.toISOString(),
      counts: {
        expenses: state.expenses?.length ?? 0,
        incomes: state.incomes?.length ?? 0,
        savings: state.savings?.length ?? 0,
        fixedExpenses: state.fixedExpenses?.length ?? 0,
        targets: state.targets?.length ?? 0,
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
      goals: state.goals ?? [],
      tasks: state.tasks ?? [],
    },
  };

  downloadJSON(filename, payload);
  return { filename, success: true };
}

/**
 * Parses a JSON string (supports both wrapped ExportPayload and raw state shape).
 * Performs basic structural validation.
 */
export function parseImportJSON(
  jsonString: string
): { success: boolean; data?: FinanceStateV2; error?: string; meta?: any } {
  try {
    const parsed = JSON.parse(jsonString);

    let rawData: any;
    let meta: any = null;

    if (parsed && parsed.data && parsed.meta) {
      // Our wrapped export format
      rawData = parsed.data;
      meta = parsed.meta;
    } else if (parsed && (Array.isArray(parsed.expenses) || Array.isArray(parsed.goals))) {
      // Raw state (v2 shape or close)
      rawData = parsed;
    } else {
      return { success: false, error: 'Unrecognized file format. Expected Cash Flow CFO export JSON.' };
    }

    // Minimal validation – core arrays must exist
    if (!Array.isArray(rawData.expenses) || !Array.isArray(rawData.goals) || !Array.isArray(rawData.tasks)) {
      return {
        success: false,
        error: 'Invalid data: missing required arrays (expenses, goals, tasks)',
      };
    }

    const cleaned: FinanceStateV2 = {
      version: 2,
      expenses: rawData.expenses || [],
      incomes: rawData.incomes || [],
      savings: rawData.savings || [],
      fixedExpenses: rawData.fixedExpenses || [],
      targets: rawData.targets || [],
      goals: rawData.goals || [],
      tasks: rawData.tasks || [],
    };

    return { success: true, data: cleaned, meta };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to parse JSON file',
    };
  }
}
