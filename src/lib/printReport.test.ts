import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales/en';
import {
  buildBackupPrintHtml,
  buildGoalsPrintHtml,
  wrapPrintDocument,
  _test,
} from './printReport';
import type { Goal } from '@/types/goal';
import type { TaskNode } from '@/types/task';

const formatAmount = (n: number) => `$${n.toFixed(2)}`;
const testT = _test.createTestPrintT(en as unknown as Record<string, unknown>);

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
      t: testT,
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
      t: testT,
    });

    expect(html).toContain('Completed Goals');
    expect(html).toContain('(Completed)');
  });

  it('buildBackupPrintHtml includes income breakdown and collections', () => {
    const html = buildBackupPrintHtml(
      {
        backups: [],
        currentState: {
          version: 2,
          expenses: [],
          incomes: [
            {
              id: 'a1',
              date: '2026-05-01',
              source: 'Invoice A',
              amount: 1000,
              incomeType: 'accrued',
            },
            {
              id: 'c1',
              date: '2026-05-15',
              source: 'Invoice A',
              amount: 400,
              incomeType: 'cash',
              linkedAccruedIncomeId: 'a1',
            },
            {
              id: 'c2',
              date: '2026-05-20',
              source: 'Salary',
              amount: 200,
              incomeType: 'cash',
            },
          ],
          savings: [],
          fixedExpenses: [],
          targets: [],
          longTermFinGoal: null,
          goals: [],
          tasks: [],
        },
        t: testT,
      },
      { formatAmount }
    );

    expect(html).toContain('Income & Collections');
    expect(html).toContain('Direct cash');
    expect(html).toContain('Outstanding accrued');
    expect(html).toContain('Invoice A');
    expect(html).toContain('Cash Collections');
    expect(html).toContain('Income collections');
  });

  it('buildGoalsPrintHtml includes 20-year fin goal when set', () => {
    const html = buildGoalsPrintHtml({
      goals: [sampleGoal],
      tasks: [],
      formatAmount,
      displayCurrency: 'USD',
      t: testT,
      longTermFinGoal: {
        targetAmount: 1e6,
        endYear: 2046,
        horizonYears: 20,
        presetKey: '1M',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
      currentSavings: 250000,
    });

    expect(html).toContain('20-Year Fin Goal');
    expect(html).toContain('1 Million');
    expect(html).toContain('25%');
  });

  it('buildGoalsPrintHtml shows duplicate tasks preference for repeating goals', () => {
    const html = buildGoalsPrintHtml({
      goals: [{ ...sampleGoal, repeatInterval: 'monthly', repeatDuplicateTasks: false }],
      tasks: [],
      formatAmount,
      displayCurrency: 'USD',
      t: testT,
    });

    expect(html).toContain('Duplicate tasks:');
    expect(html).toContain('Monthly');
    expect(html).toContain('No');
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
            longTermFinGoal: null,
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
        longTermFinGoal: null,
        goals: [sampleGoal],
        tasks: [sampleTask],
      },
      t: testT,
      printedAt: new Date('2026-06-16T12:00:00'),
    });

    expect(html).toContain('Backup Report');
    expect(html).toContain('Auto-Backup History');
    expect(html).toContain('Current Data');
    expect(html).toContain('Latest');
    expect(html).toContain('Export JSON');
  });

  it('buildBackupPrintHtml includes 20-year fin goal when set', () => {
    const html = buildBackupPrintHtml(
      {
        backups: [],
        currentState: {
          version: 2,
          expenses: [],
          incomes: [],
          savings: [
            {
              id: 's1',
              date: '2026-06-01',
              amount: 250000,
              savingType: 'balance',
              note: '',
            },
          ],
          fixedExpenses: [],
          targets: [],
          longTermFinGoal: {
            targetAmount: 1e6,
            endYear: 2046,
            horizonYears: 20,
            presetKey: '1M',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
          goals: [],
          tasks: [],
        },
        t: testT,
      },
      { formatAmount }
    );

    expect(html).toContain('20-Year Fin Goal');
    expect(html).toContain('1 Million');
    expect(html).toContain('25%');
  });

  it('buildGoalsPrintHtml uses locale-aware printed date', () => {
    const enHtml = buildGoalsPrintHtml({
      goals: [sampleGoal],
      tasks: [],
      formatAmount,
      displayCurrency: 'USD',
      t: testT,
      locale: 'en',
      printedAt: new Date('2026-06-16T12:00:00'),
    });
    const jaHtml = buildGoalsPrintHtml({
      goals: [sampleGoal],
      tasks: [],
      formatAmount,
      displayCurrency: 'USD',
      t: testT,
      locale: 'ja',
      printedAt: new Date('2026-06-16T12:00:00'),
    });

    expect(enHtml).toContain('Jun');
    expect(jaHtml).toContain('6');
    expect(jaHtml).not.toContain('Jun');
  });

  it('wrapPrintDocument produces valid HTML shell', () => {
    const doc = wrapPrintDocument('Test Title', '<p>Body</p>', 'zh-TW');
    expect(doc).toContain('<title>Test Title</title>');
    expect(doc).toContain('<p>Body</p>');
    expect(doc).toContain('lang="zh-Hant"');
  });
});