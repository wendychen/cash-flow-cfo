import { describe, expect, it } from 'vitest';
import { goalIdsWithLockedDeadlines, isGoalDeadlineLocked } from './goalDeadlineLock';

describe('goalDeadlineLock', () => {
  it('treats missing deadlineLocked as locked', () => {
    expect(isGoalDeadlineLocked({})).toBe(true);
    expect(isGoalDeadlineLocked({ deadlineLocked: true })).toBe(true);
  });

  it('allows soft deadlines only when explicitly false', () => {
    expect(isGoalDeadlineLocked({ deadlineLocked: false })).toBe(false);
  });

  it('collects locked goal ids', () => {
    const ids = goalIdsWithLockedDeadlines([
      { id: 'g1' },
      { id: 'g2', deadlineLocked: false },
      { id: 'g3', deadlineLocked: true },
    ]);
    expect(ids).toEqual(new Set(['g1', 'g3']));
  });
});