import { useQueries } from '@tanstack/react-query';

import { shiftMonth } from '@/utils/dates';

/**
 * The window of months behind the trend line in `MonthTrend`.
 *
 * It reads N months through **the same query keys the screens already use** (MAD-002), which is what
 * makes the chart nearly free:
 *
 * - the centre month is the entry the screen's own query registered, so it costs no extra request;
 * - a month visited before is already in the cache and appears without touching the network;
 * - every `invalidateQueries` the mutations already fire (MAD-003) refreshes the chart too, so no
 *   write in the app had to learn that a chart exists.
 *
 * This hook knows nothing about endpoints or fields. The feature that owns a month endpoint passes
 * both in, which keeps the URL and the meaning of "the value of the month" in one place per feature.
 */

export type MonthValue = {
  year: number;
  month: number;
  /**
   * `null` while the month has not arrived, and `null` when its request failed.
   *
   * Never zero. A zero draws a point on the floor of the chart asserting the month had no movement,
   * which is a different claim from "this month has not been read" - the same distinction the
   * recurring lines already make between a null amount and `R$ 0,00`.
   */
  value: number | null;
};

/** How many months of context sit on each side of the selected one. */
export const SERIES_RADIUS = 2;

/** Where a month endpoint lives and what counts as its value, from the owning feature. */
export type MonthSource<T> = {
  queryKey: (year: number, month: number) => readonly unknown[];
  queryFn: (year: number, month: number) => Promise<T>;
  value: (data: T) => number;
};

/**
 * The months of the window, oldest first, crossing the year boundary through `shiftMonth` rather
 * than by arithmetic on the month alone.
 */
export function monthWindow(year: number, month: number): { year: number; month: number }[] {
  const offsets = Array.from(
    { length: SERIES_RADIUS * 2 + 1 },
    (_unused, index) => index - SERIES_RADIUS
  );

  return offsets.map((offset) => shiftMonth(year, month, offset));
}

export function useMonthSeries<T>(
  year: number,
  month: number,
  source: MonthSource<T>
): MonthValue[] {
  const months = monthWindow(year, month);

  return useQueries({
    queries: months.map(({ year: entryYear, month: entryMonth }) => ({
      queryKey: source.queryKey(entryYear, entryMonth),
      queryFn: () => source.queryFn(entryYear, entryMonth),
    })),
    // `combine` runs on the results, so the array identity stays stable while they do - a new array
    // built in the render body instead would give the chart a different `series` on every render.
    combine: (results) =>
      results.map((result, index) => {
        const entry = months[index] ?? { year, month };

        return {
          year: entry.year,
          month: entry.month,
          value: result.data === undefined ? null : source.value(result.data),
        };
      }),
  });
}
