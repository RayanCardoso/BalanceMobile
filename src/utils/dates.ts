/**
 * Dates are handled as `YYYY-MM-DD` strings from end to end and never pass through a `Date`. The API
 * speaks `DateOnly`, and `new Date('2026-08-21')` parses as UTC midnight: read back in any negative
 * offset it is the 20th, so a purchase would be recorded on the wrong day. Nothing here constructs a
 * `Date`, which is what the timezone tests pin.
 */

export type ApiDateParts = {
  year: number;
  month: number;
  day: number;
};

const API_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

/** `{ year: 2026, month: 8, day: 21 }` becomes `'2026-08-21'`. */
export function toApiDate(parts: ApiDateParts): string {
  return `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}`;
}

/** Reads the parts a `YYYY-MM-DD` string carries, or null when it is not one. */
export function fromApiDate(value: string): ApiDateParts | null {
  const match = API_DATE.exec(value);

  if (match === null) {
    return null;
  }

  const [, year = '', month = '', day = ''] = match;

  return { year: Number(year), month: Number(month), day: Number(day) };
}

/** `(2026, 8)` becomes `'Agosto de 2026'`. */
export function monthLabel(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1];

  if (name === undefined) {
    throw new RangeError(`month out of range: ${month}`);
  }

  return `${name} de ${year}`;
}

/**
 * The short form a chart axis uses: `(2026, 8, 2026)` becomes `'Ago'`.
 *
 * `reference` is the year the reading is anchored on — the month the screen is showing. A month
 * outside it carries its own two-digit year (`'Dez 25'`), because a series that crosses a year
 * boundary would otherwise show December and January as two unrelated three-letter labels and give
 * the user no way to tell which side of the turn each one is on.
 */
export function monthAbbrev(year: number, month: number, reference: number): string {
  const name = MONTH_NAMES[month - 1];

  if (name === undefined) {
    throw new RangeError(`month out of range: ${month}`);
  }

  const abbrev = name.slice(0, 3);

  return year === reference ? abbrev : `${abbrev} ${pad(year % 100, 2)}`;
}

/**
 * Today, as the `YYYY-MM-DD` string the API's `DateOnly` expects.
 *
 * Built from the local getters rather than from `toISOString()`, which is UTC: at 21:00 on 21 August
 * in São Paulo the ISO form already reads the 22nd, and the purchase would be recorded a day late.
 */
export function todayApiDate(now: Date = new Date()): string {
  return toApiDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/**
 * The month a month-scoped screen opens on.
 *
 * Read through the local getters, never by formatting a `Date` to a string and slicing it: the ISO
 * form is UTC, so at 21:00 on 31 August in São Paulo it would already say September.
 */
export function currentMonth(now: Date = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Moves a month by `delta`, carrying across the year boundary in both directions. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const monthsFromYearZero = year * 12 + (month - 1) + delta;

  return {
    year: Math.floor(monthsFromYearZero / 12),
    month: (monthsFromYearZero % 12) + 1,
  };
}
