import { describe, it, expect } from 'vitest';
import { parseImportJSON } from './exportImport';
import { sampleV2State } from '@/test/fixtures/v2State';

describe('parseImportJSON', () => {
  it('parses wrapped export payload with meta', () => {
    const payload = {
      meta: {
        app: 'cash-flow-cfo',
        schemaVersion: 2,
        exportedAt: '2026-06-01T00:00:00.000Z',
        counts: { expenses: 2, goals: 1, tasks: 2 },
      },
      data: sampleV2State,
    };

    const result = parseImportJSON(JSON.stringify(payload));
    expect(result.success).toBe(true);
    expect(result.data?.version).toBe(2);
    expect(result.data?.expenses).toHaveLength(2);
    expect(result.meta?.app).toBe('cash-flow-cfo');
  });

  it('parses raw v2 state without wrapper', () => {
    const result = parseImportJSON(JSON.stringify(sampleV2State));
    expect(result.success).toBe(true);
    expect(result.data?.goals[0].title).toBe('Build MVP');
  });

  it('rejects unrecognized format', () => {
    const result = parseImportJSON(JSON.stringify({ foo: 'bar' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unrecognized file format');
  });

  it('rejects missing required arrays', () => {
    const result = parseImportJSON(
      JSON.stringify({ version: 2, expenses: [], incomes: [] })
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('missing required arrays');
  });

  it('rejects invalid JSON', () => {
    const result = parseImportJSON('{ not valid json');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('defaults missing optional arrays to empty', () => {
    const minimal = {
      version: 2,
      expenses: [],
      goals: [],
      tasks: [],
    };
    const result = parseImportJSON(JSON.stringify(minimal));
    expect(result.success).toBe(true);
    expect(result.data?.incomes).toEqual([]);
    expect(result.data?.savings).toEqual([]);
    expect(result.data?.fixedExpenses).toEqual([]);
    expect(result.data?.targets).toEqual([]);
    expect(result.data?.longTermFinGoal).toBeNull();
  });

  it('preserves longTermFinGoal through import', () => {
    const withGoal = {
      ...sampleV2State,
      longTermFinGoal: {
        targetAmount: 1e6,
        endYear: 2046,
        horizonYears: 20 as const,
        presetKey: '1M',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    };
    const result = parseImportJSON(JSON.stringify(withGoal));
    expect(result.success).toBe(true);
    expect(result.data?.longTermFinGoal?.presetKey).toBe('1M');
    expect(result.data?.longTermFinGoal?.targetAmount).toBe(1e6);
  });
});