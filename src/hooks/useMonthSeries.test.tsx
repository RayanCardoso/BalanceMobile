import { renderHook, waitFor } from '@testing-library/react-native';

import { monthWindow, SERIES_RADIUS, useMonthSeries } from '@/hooks/useMonthSeries';
import { qk } from '@/services/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';

/**
 * Every expected month below is a literal pair. Deriving one with `shiftMonth` in the assertion
 * would mirror the implementation and agree with it on any wrong answer (lesson L-010).
 */

let client = createTestQueryClient();

beforeEach(() => {
  client = createTestQueryClient();
});

afterEach(() => {
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

describe('monthWindow', () => {
  it('centres the window on the month it was given', () => {
    expect(monthWindow(2026, 8)).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
  });

  it('crosses back over a year boundary', () => {
    expect(monthWindow(2026, 1)).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
    ]);
  });

  it('crosses forward over a year boundary', () => {
    expect(monthWindow(2026, 12)).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });

  it('holds one month on each side per unit of radius', () => {
    expect(monthWindow(2026, 8)).toHaveLength(SERIES_RADIUS * 2 + 1);
  });
});

/** A stand-in for a feature's month endpoint: `{ total }` for whatever month was asked for. */
const monthBody = (year: number, month: number) => ({ total: year * 100 + month });

type MonthBody = { total: number };

const sourceWith = (queryFn: jest.Mock) => ({
  queryKey: qk.dashboard,
  queryFn: queryFn as unknown as (year: number, month: number) => Promise<MonthBody>,
  value: (data: MonthBody) => data.total,
});

const renderSeries = (year: number, month: number, source: ReturnType<typeof sourceWith>) =>
  renderHook(() => useMonthSeries(year, month, source), {
    wrapper: createQueryWrapper(client),
  });

describe('useMonthSeries', () => {
  it('answers one entry per month of the window, in order, carrying each value', async () => {
    const queryFn = jest.fn(async (year: number, month: number) => monthBody(year, month));

    const { result } = renderSeries(2026, 8, sourceWith(queryFn));

    await waitFor(() => {
      expect(result.current.every((entry) => entry.value !== null)).toBe(true);
    });

    expect(result.current).toEqual([
      { year: 2026, month: 6, value: 202606 },
      { year: 2026, month: 7, value: 202607 },
      { year: 2026, month: 8, value: 202608 },
      { year: 2026, month: 9, value: 202609 },
      { year: 2026, month: 10, value: 202610 },
    ]);
  });

  /**
   * The whole reason the series reads through `qk` (MAD-002): the centre month is the same cache
   * entry the screen's own query registered, so the chart costs nothing extra there, and every
   * `invalidateQueries` a mutation already fires refreshes the chart too.
   */
  it('registers each month under the key factory it was given', async () => {
    const queryFn = jest.fn(async (year: number, month: number) => monthBody(year, month));

    const { result } = renderSeries(2026, 8, sourceWith(queryFn));

    await waitFor(() => {
      expect(result.current[2]?.value).toBe(202608);
    });

    expect(client.getQueryData(qk.dashboard(2026, 8))).toEqual({ total: 202608 });
    expect(client.getQueryData(qk.dashboard(2026, 6))).toEqual({ total: 202606 });
  });

  /**
   * A month visited before draws immediately, on the first render, while its neighbours are still
   * null - that is what makes moving back through months feel instant instead of blank. It is shown
   * *and* revalidated: the app runs with the default `staleTime` of 0, so the cached value is the
   * first frame, not the last word.
   */
  it('draws a month already in the cache on the first render', () => {
    client.setQueryData(qk.dashboard(2026, 7), { total: 999 });

    const queryFn = jest.fn(async (year: number, month: number) => monthBody(year, month));

    const { result } = renderSeries(2026, 8, sourceWith(queryFn));

    expect(result.current.map((entry) => entry.value)).toEqual([null, 999, null, null, null]);
  });

  /**
   * A neighbour that failed is a point the chart leaves out, never a zero and never an error on the
   * screen: the `ErrorState` belongs to the month the screen actually reads.
   */
  it('leaves a month that failed as null and keeps the rest', async () => {
    const queryFn = jest.fn(async (year: number, month: number) => {
      if (year === 2026 && month === 9) {
        throw new Error('offline');
      }

      return monthBody(year, month);
    });

    const { result } = renderSeries(2026, 8, sourceWith(queryFn));

    await waitFor(() => {
      expect(result.current[4]?.value).toBe(202610);
    });

    expect(result.current[3]).toEqual({ year: 2026, month: 9, value: null });
    expect(result.current[2]).toEqual({ year: 2026, month: 8, value: 202608 });
  });

  it('starts every month as null rather than as zero', () => {
    const queryFn = jest.fn(async (year: number, month: number) => monthBody(year, month));

    const { result } = renderSeries(2026, 8, sourceWith(queryFn));

    expect(result.current.map((entry) => entry.value)).toEqual([null, null, null, null, null]);
  });

  it('recentres on the month it is given, so the screen owns the window', async () => {
    const queryFn = jest.fn(async (year: number, month: number) => monthBody(year, month));
    const source = sourceWith(queryFn);

    const { result, rerender } = renderHook(
      ({ year, month }: { year: number; month: number }) => useMonthSeries(year, month, source),
      { initialProps: { year: 2026, month: 8 }, wrapper: createQueryWrapper(client) }
    );

    await waitFor(() => {
      expect(result.current[2]?.value).toBe(202608);
    });

    rerender({ year: 2026, month: 9 });

    await waitFor(() => {
      expect(result.current[2]?.value).toBe(202609);
    });

    expect(result.current.map((entry) => entry.month)).toEqual([7, 8, 9, 10, 11]);
  });
});
