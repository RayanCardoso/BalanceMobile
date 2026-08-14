import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { MonthlyDashboard } from '@/features/dashboard/model/dashboard';
import { get } from '@/shared/api/httpClient';
import { qk } from '@/shared/api/queryKeys';

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
export function useDashboard(year: number, month: number): UseQueryResult<MonthlyDashboard, Error> {
  return useQuery({
    queryKey: qk.dashboard(year, month),
    queryFn: () => get<MonthlyDashboard>(`/dashboard/${year}/${month}`),
  });
}
