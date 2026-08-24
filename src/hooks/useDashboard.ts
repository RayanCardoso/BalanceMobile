import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { MonthlyDashboard } from '@/types/dashboard';
import { get } from '@/services/api';
import { qk } from '@/services/queryKeys';
import { useMonthSeries, type MonthValue } from '@/hooks/useMonthSeries';

/**
 * The month the dashboard shows, read from `GET /api/dashboard/{year}/{month}`.
 *
 * Keyed through `qk.dashboard(year, month)` (MAD-002), which is the key every write already
 * invalidates: `useRegisterExpense`, `useRegisterIncomePayment` and the recurring payment hooks all
 * name it, so a mutation refreshes this screen without either side knowing about the other. Reading
 * under a hand-written key here would leave the dashboard stale after every write in the app.
 *
 * Read-only: the dashboard has no mutation of its own. Every figure it shows is produced by a write
 * that belongs to income, expenses or recurring bills.
 */
/** The one place the dashboard's month route is written. Shared by the month and by the series. */
const readDashboard = (year: number, month: number): Promise<MonthlyDashboard> =>
  get<MonthlyDashboard>(`/dashboard/${year}/${month}`);

export function useDashboard(year: number, month: number): UseQueryResult<MonthlyDashboard, Error> {
  return useQuery({
    queryKey: qk.dashboard(year, month),
    queryFn: () => readDashboard(year, month),
  });
}

/**
 * The months behind the trend line in the dashboard's `MonthTrend`.
 *
 * The value of a month is `balance` - the API's own subtraction (MAD-001), already signed. A month
 * the user ended owing money in plots below the others because the number itself is negative, which
 * is the same reading spec DASH AC5 asks the figure on screen to keep.
 *
 * Reading through `qk.dashboard` is what makes this nearly free: the centre month is the entry
 * `useDashboard` already registered, and every write in the app already invalidates it.
 */
export function useDashboardSeries(year: number, month: number): MonthValue[] {
  return useMonthSeries(year, month, {
    queryKey: qk.dashboard,
    queryFn: readDashboard,
    value: (data) => data.balance,
  });
}
