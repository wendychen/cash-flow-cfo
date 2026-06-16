import { describe, it, expect } from 'vitest';
import { parseCsvToFinanceState, csvToExportPayload } from './csvImport';

const SAMPLE_CSV = `### EXPENSES ###
Date,Description,Amount,Category,NeedsCheck,ReviewCount,LinkedGoalId,LinkedTaskId,LinkedTaskType
2026-01-15,"Goal: Launch Product",5000,misc,true,,goal-1,,

### GOALS ###
Id,Title,Deadline,Completed,IsMagicWand,Category,Constraint,CreatedAt,UrlPack,Ideations,Budget,PreTasks,PostTasks,PostDreams
goal-1,Launch Product,2026-06-01,false,false,misc,,2026-01-01T00:00:00.000Z,[],[],5000,"[{""id"":""t1"",""action"":""Research"",""cost"":200}]","[]","[]"

### TASKS ###
Id,GoalId,ParentId,TaskType,SortOrder,Title,Cost,TimeCost,Deadline,IsMagicWand,Completed,LinkedExpenseId,CreatedAt
t1,goal-1,,pre,0,Research,200,3 days,2026-02-01,false,false,,2026-01-01T00:00:00.000Z

### INCOMES ###
Date,Source,Amount,Note,IncomeType,ReviewCount
2026-01-01,Salary,80000,,cash,
`;

describe('parseCsvToFinanceState', () => {
  it('parses sectioned CSV export from legacy app', () => {
    const result = parseCsvToFinanceState(SAMPLE_CSV);
    expect(result.success).toBe(true);
    expect(result.data?.goals).toHaveLength(1);
    expect(result.data?.goals[0].title).toBe('Launch Product');
    expect(result.data?.expenses).toHaveLength(1);
    expect(result.data?.incomes).toHaveLength(1);
    expect(result.data?.tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('wraps as importable export payload', () => {
    const result = csvToExportPayload(SAMPLE_CSV);
    expect(result.success).toBe(true);
    expect(result.payload?.meta.app).toBe('cash-flow-cfo');
    expect(result.payload?.data.version).toBe(2);
  });

  it('rejects empty CSV', () => {
    const result = parseCsvToFinanceState('not,valid\n');
    expect(result.success).toBe(false);
  });
});