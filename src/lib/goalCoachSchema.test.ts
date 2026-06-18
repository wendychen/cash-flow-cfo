import { describe, expect, it } from 'vitest';
import { filterSuggestionToKnownGoals, parseGoalReachAiSuggestion } from './goalCoachSchema';

describe('goalCoachSchema', () => {
  it('parses valid suggestion JSON', () => {
    const result = parseGoalReachAiSuggestion({
      summary: 'Shift goal B earlier.',
      deadlineShifts: [
        {
          goalId: 'g2',
          newDeadline: '2026-11-01',
          reason: 'Reduce Q3 pile-up',
        },
      ],
    });
    expect(result?.summary).toContain('Shift');
    expect(result?.deadlineShifts).toHaveLength(1);
  });

  it('rejects invented fields and invalid dates', () => {
    expect(
      parseGoalReachAiSuggestion({
        summary: 'x',
        deadlineShifts: [{ goalId: 'g1', newDeadline: 'bad', reason: 'nope' }],
      })
    ).toBeNull();
  });

  it('filters suggestions to known goal ids', () => {
    const filtered = filterSuggestionToKnownGoals(
      {
        summary: 'Plan',
        reorder: [
          { goalId: 'g1', newPriority: 1 },
          { goalId: 'unknown', newPriority: 2 },
        ],
      },
      new Set(['g1'])
    );
    expect(filtered.reorder).toHaveLength(1);
    expect(filtered.reorder?.[0].goalId).toBe('g1');
  });

  it('drops deadline shifts for locked goals', () => {
    const filtered = filterSuggestionToKnownGoals(
      {
        summary: 'Plan',
        deadlineShifts: [
          { goalId: 'g1', newDeadline: '2026-12-01', reason: 'ok' },
          { goalId: 'g2', newDeadline: '2027-01-01', reason: 'locked' },
        ],
      },
      new Set(['g1', 'g2']),
      new Set(['g2'])
    );
    expect(filtered.deadlineShifts).toHaveLength(1);
    expect(filtered.deadlineShifts?.[0].goalId).toBe('g1');
  });
});