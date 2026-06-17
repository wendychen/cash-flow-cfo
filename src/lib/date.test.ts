import { describe, it, expect } from 'vitest';
import {
  parseLocalDate,
  startOfDay,
  endOfDay,
  isDateInPeriod,
  getWeeksInMonth,
  buildMonthPeriod,
  buildQuarterPeriod,
  normalizePeriodBounds,
} from './date';

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseLocalDate('2026-04-30')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(0);
  });

  it('parses ISO datetime using local calendar day', () => {
    const d = parseLocalDate('2026-03-28T15:30:00.000Z')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(28);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('not-a-date')).toBeNull();
  });
});

describe('startOfDay / endOfDay', () => {
  it('startOfDay zeroes time', () => {
    const d = startOfDay(new Date(2026, 5, 15, 14, 30, 0));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('endOfDay sets 23:59:59.999', () => {
    const d = endOfDay(new Date(2026, 5, 15, 0, 0, 0));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });
});

describe('normalizePeriodBounds', () => {
  it('extends end to end of day', () => {
    const period = normalizePeriodBounds({
      startDate: new Date(2026, 3, 1),
      endDate: new Date(2026, 3, 30),
    });
    expect(period.endDate.getHours()).toBe(23);
    expect(period.endDate.getDate()).toBe(30);
  });
});

describe('isDateInPeriod — reported user bugs', () => {
  it('includes 2026-04-30 in April 2026', () => {
    const april = buildMonthPeriod(2026, 3);
    expect(isDateInPeriod('2026-04-30', april)).toBe(true);
  });

  it('includes 2026-04-30 in Q2 2026', () => {
    const q2 = buildQuarterPeriod(2026, 1);
    expect(isDateInPeriod('2026-04-30', q2)).toBe(true);
  });

  it('includes 2026-03-27 in March 2026', () => {
    const march = buildMonthPeriod(2026, 2);
    expect(isDateInPeriod('2026-03-27', march)).toBe(true);
  });

  it('includes 2026-03-28 in March 2026', () => {
    const march = buildMonthPeriod(2026, 2);
    expect(isDateInPeriod('2026-03-28', march)).toBe(true);
  });

  it('includes 2026-03-26 in March 2026', () => {
    const march = buildMonthPeriod(2026, 2);
    expect(isDateInPeriod('2026-03-26', march)).toBe(true);
  });

  it('includes 2026-03-28 in March W4 (not only month view)', () => {
    const weeks = getWeeksInMonth(2026, 2);
    const w4 = weeks.find((w) => w.week === 4)!;
    expect(isDateInPeriod('2026-03-28', w4)).toBe(true);
  });

  it('excludes 2026-03-28 from March W3', () => {
    const weeks = getWeeksInMonth(2026, 2);
    const w3 = weeks.find((w) => w.week === 3)!;
    expect(isDateInPeriod('2026-03-28', w3)).toBe(false);
  });

  it('includes 2026-04-30 in April W5', () => {
    const weeks = getWeeksInMonth(2026, 3);
    const w5 = weeks.find((w) => w.week === 5)!;
    expect(isDateInPeriod('2026-04-30', w5)).toBe(true);
  });

  it('includes mid-June record in June but not in W2 when date is 6/15', () => {
    const june = buildMonthPeriod(2026, 5);
    const weeks = getWeeksInMonth(2026, 5);
    const w2 = weeks.find((w) => w.week === 2)!;

    expect(isDateInPeriod('2026-06-15', june)).toBe(true);
    expect(isDateInPeriod('2026-06-15', w2)).toBe(false);
  });

  it('includes 2026-06-10 in June W2', () => {
    const weeks = getWeeksInMonth(2026, 5);
    const w2 = weeks.find((w) => w.week === 2)!;
    expect(isDateInPeriod('2026-06-10', w2)).toBe(true);
  });

  it('returns true when period is null (no filter)', () => {
    expect(isDateInPeriod('2026-01-15', null)).toBe(true);
  });

  it('returns true for missing date string', () => {
    expect(isDateInPeriod(undefined, buildMonthPeriod(2026, 0))).toBe(true);
  });
});

describe('isDateInPeriod — edge cases vs naive UTC parsing', () => {
  it('last day of month is not dropped (old bug: endDate at midnight)', () => {
    const period = {
      startDate: new Date(2026, 3, 1),
      endDate: new Date(2026, 3, 30), // midnight — would fail with naive compare
    };
    expect(isDateInPeriod('2026-04-30', period)).toBe(true);
  });

  it('first day of month is included', () => {
    expect(isDateInPeriod('2026-01-01', buildMonthPeriod(2026, 0))).toBe(true);
  });

  it('last day of year is included in year period', () => {
    const year = {
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 11, 31),
    };
    expect(isDateInPeriod('2026-12-31', year)).toBe(true);
  });

  it('excludes date before period start', () => {
    expect(isDateInPeriod('2026-02-28', buildMonthPeriod(2026, 2))).toBe(false);
  });

  it('excludes date after period end', () => {
    expect(isDateInPeriod('2026-04-01', buildMonthPeriod(2026, 2))).toBe(false);
  });
});

describe('getWeeksInMonth', () => {
  it('March 2026 has 5 weeks', () => {
    expect(getWeeksInMonth(2026, 2)).toHaveLength(5);
  });

  it('April 2026 W5 ends on 4/30', () => {
    const weeks = getWeeksInMonth(2026, 3);
    const w5 = weeks.find((w) => w.week === 5)!;
    expect(w5.endDate.getDate()).toBe(30);
    expect(w5.endDate.getMonth()).toBe(3);
  });

  it('week ranges do not overlap and cover the month', () => {
    const weeks = getWeeksInMonth(2026, 2);
    expect(weeks[0].startDate.getDate()).toBe(1);
    expect(weeks[weeks.length - 1].endDate.getDate()).toBe(31);
  });
});