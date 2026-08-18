import {
  currentMonth,
  fromApiDate,
  monthAbbrev,
  monthLabel,
  shiftMonth,
  toApiDate,
  todayApiDate,
} from '@/utils/dates';

/** Every expected value below is a literal, never a value recomputed through a `Date`. */

describe('toApiDate and fromApiDate', () => {
  it('round-trips a date without shifting a day', () => {
    const parts = fromApiDate('2026-08-21');

    expect(parts).toEqual({ year: 2026, month: 8, day: 21 });
    expect(toApiDate(parts!)).toBe('2026-08-21');
  });

  it('pads a single-digit month and day', () => {
    expect(toApiDate({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07');
  });

  it.each([
    ['a non-date string', 'ontem'],
    ['an unpadded date', '2026-8-21'],
    ['a date-time', '2026-08-21T00:00:00Z'],
    ['an empty string', ''],
  ])('returns null for %s', (_label, input) => {
    expect(fromApiDate(input)).toBeNull();
  });
});

describe('todayApiDate', () => {
  it('writes a local instant as the day it is locally', () => {
    expect(todayApiDate(new Date(2026, 7, 21, 12, 0))).toBe('2026-08-21');
  });

  // At the suite's UTC-11 offset the ISO form of a local evening is already the next day. A default
  // date read off `toISOString()` would record a payment one day late.
  it('stays on the 21st late on 21 August, where the UTC date is already the 22nd', () => {
    const lateEvening = new Date(2026, 7, 21, 21, 0);

    expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-08-22');
    expect(todayApiDate(lateEvening)).toBe('2026-08-21');
  });
});

describe('currentMonth', () => {
  it('reads the year and the month a local instant falls in', () => {
    expect(currentMonth(new Date(2026, 7, 15, 12, 0))).toEqual({ year: 2026, month: 8 });
  });

  // The suite runs at UTC-11, where a local evening on the last day of August is already the first
  // of September in UTC. A month read off `toISOString()` would open the screen on the wrong month.
  it('stays in August late on 31 August, where the UTC date is already September', () => {
    const lateAugustEvening = new Date(2026, 7, 31, 21, 0);

    expect(lateAugustEvening.toISOString().slice(0, 7)).toBe('2026-09');
    expect(currentMonth(lateAugustEvening)).toEqual({ year: 2026, month: 8 });
  });
});

describe('shiftMonth', () => {
  it('crosses December into January of the next year', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('crosses January back into December of the previous year', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('stays inside the year for a step that does not cross it', () => {
    expect(shiftMonth(2026, 8, 1)).toEqual({ year: 2026, month: 9 });
  });
});

describe('monthLabel', () => {
  it('names the month in Portuguese', () => {
    expect(monthLabel(2026, 8)).toBe('Agosto de 2026');
  });

  it('names the first month of a year', () => {
    expect(monthLabel(2027, 1)).toBe('Janeiro de 2027');
  });
});

describe('monthAbbrev', () => {
  it('abbreviates a month inside the reference year to three letters', () => {
    expect(monthAbbrev(2026, 8, 2026)).toBe('Ago');
  });

  it('carries the year when the month is not in the reference year', () => {
    expect(monthAbbrev(2025, 12, 2026)).toBe('Dez 25');
  });

  it('carries the year forward across the boundary too', () => {
    expect(monthAbbrev(2027, 1, 2026)).toBe('Jan 27');
  });

  it('keeps the accent the full name carries', () => {
    expect(monthAbbrev(2026, 3, 2026)).toBe('Mar');
    expect(monthAbbrev(2026, 5, 2026)).toBe('Mai');
  });

  it('rejects a month outside 1..12, like monthLabel does', () => {
    expect(() => monthAbbrev(2026, 13, 2026)).toThrow(RangeError);
  });
});

/**
 * The regression sensor for the whole module.
 *
 * The suite runs under Pacific/Midway (UTC-11), pinned in `jest.globalSetup.js`. It has to be pinned
 * there and not here: Jest sandboxes `process.env`, so assigning `TZ` inside a test never reaches V8
 * and the timezone silently stays put — the assignment appears to work and the tests pass while
 * proving nothing. One offset for the whole run is therefore all Jest can give without a second
 * project config, and a negative one is the right choice: it is the direction that breaks `DateOnly`,
 * because `new Date('2026-08-21')` parses as UTC midnight and reads back as the 20th.
 *
 * Three assertions in order, and all three are needed:
 *   1. the offset really applied — otherwise everything below is vacuous;
 *   2. the hazard is genuinely reachable here — a `Date`-based implementation *would* be wrong;
 *   3. this module is not wrong.
 *
 * Without (2) these tests would pass just as happily under UTC, where nothing can go wrong, and would
 * not discriminate between an implementation that avoids `Date` and one that got lucky.
 */
describe('under a negative UTC offset', () => {
  it('really runs under that offset', () => {
    expect(new Date('2026-08-21T12:00:00Z').getTimezoneOffset()).toBe(660);
  });

  it('exposes the hazard: a Date-based read lands on the previous day', () => {
    expect(new Date('2026-08-21').getDate()).toBe(20);
  });

  it('reads the day the string carries', () => {
    expect(fromApiDate('2026-08-21')).toEqual({ year: 2026, month: 8, day: 21 });
  });

  it('round-trips to the same string', () => {
    expect(toApiDate({ year: 2026, month: 8, day: 21 })).toBe('2026-08-21');
  });
});
