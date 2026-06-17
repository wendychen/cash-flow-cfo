import { describe, expect, it } from 'vitest';
import {
  buildBackupPrintHtml,
  buildGoalsPrintHtml,
  wrapPrintDocument,
  _test,
} from './printReport';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';

const formatAmount = (n: number) => `$${n.toFixed(2)}`;

const sampleGoal: Goal = {
  id: 'g1',
  title: 'Learn TypeScript',
  deadline: '2026-12-31',
  completed: false,
  isMagicWand: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  category: 'food',
  budget: 5000,
  timeCost: '40h',
  ideations: [{ id: 'i1', content: 'Read docs daily', createdAt: '2026-01-02' }],
  constraint: 'No new courses until Q3',
  urlPack: ['https://example.com'],
};

const sampleTask: TaskNode = {
  id: 't1',
  goalId: 'g1',
  parentId: null,
  taskType: 'pre',
  sortOrder: 0,
  title: 'Finish basics',
  cost: 100,
  timeCost: '10h',
  deadline: '2026-06-01',
  isMagicWand: false,
  completed: false,
  createdAt: '2026-01-01',
};

describe('printReport', () => {
  it('escapes HTML in user content', () => {
    expect(_test.escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('buildGoalsPrintHtml includes goal title and task', () => {
    const html = buildGoalsPrintHtml({
      goals: [sampleGoal],
      tasks: [sampleTask],
      formatAmount,
      displayCurrency: 'USD',
      printedAt: new Date('2026-06-16T12:00:00'),
    });

    expect(html).toContain('Learn TypeScript');
    expect(html).toContain('Finish basics');
    expect(html).toContain('Pre-Tasks');
    expect(html).toContain('Read docs daily');
    expect(html).toContain('Display currency: USD');
  });

  it('buildGoalsPrintHtml separates completed goals', () => {
    const html = buildGoalsPrintHtml({
      goals: [{ ...sampleGoal, completed: true }],
      tasks: [],
      formatAmount,
      displayCurrency: 'USD',
    });

    expect(html).toContain('Completed Goals');
    expect(html).toContain('(Completed)');
  });

  it('buildBackupPrintHtml lists backup snapshots and current counts', () => {
    const html = buildBackupPrintHtml({
      backups: [
        {
          savedAt: '2026-06-15T10:00:00.000Z',
          data: {
            version: 2,
            expenses: [{ id: 'e1' } as never],
            incomes: [],
            savings: [],
            fixedExpenses: [],
            targets: [],
            goals: [{ id: 'g1' } as never, { id: 'g2' } as never],
            tasks: [],
          },
        },
      ],
      currentState: {
        version: 2,
        expenses: [],
        incomes: [],
        savings: [],
        fixedExpenses: [],
        targets: [],
        goals: [sampleGoal],
        tasks: [sampleTask],
      },
      printedAt: new Date('2026-06-16T12:00:00'),
    });

    expect(html).toContain('Backup Report');
    expect(html).toContain('Auto-Backup History');
    expect(html).toContain('Current Data');
    expect(html).toContain('Latest');
    expect(html).toContain('Export JSON');
  });

  it('wrapPrintDocument produces valid HTML shell', () => {
    const doc = wrapPrintDocument('Test Title', '<p>Body</p>');
    expect(doc).toContain('<title>Test Title</title>');
    expect(doc).toContain('<p>Body</p>');
  });
});