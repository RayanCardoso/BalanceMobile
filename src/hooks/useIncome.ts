import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  IncomePayment,
  IncomeSource,
  IncomeSourceVersion,
  MonthlyIncome,
} from '@/types/income';
import { get, post, put } from '@/services/api';
import { qk } from '@/services/queryKeys';
import { fromApiDate } from '@/utils/dates';
import { useMonthSeries, type MonthValue } from '@/hooks/useMonthSeries';

/**
 * The income month and the three writes against it.
 *
 * Spec INC AC6 is the load-bearing part: a recorded payment has to make the month show the new
 * received amount "without a manual reload". That is the `invalidateQueries` in `onSuccess`, and the
 * month it invalidates is **the one the API returned** (MAD-003), not the one the screen was showing.
 * A salary paid on 3 September for reference month August has to refresh August; refreshing the
 * payment date's month would re-read a list the payment is not in.
 *
 * Each `onSuccess` returns its invalidation promise, so the mutation stays pending until the
 * refreshed month has arrived and a form closing on success closes over correct data.
 */

/**
 * Spec INC AC3 and AC4 as a discriminated union: a Recurring source carries an amount and an expected
 * day, a Variable source carries neither. The API rejects a Variable source that sends either, so the
 * shape makes the wrong payload unbuildable rather than merely tested against.
 */
export type RegisterIncomeSourceInput =
  | { name: string; type: 0; personId: string; amount: number; expectedDay: number }
  | { name: string; type: 1; personId: string };

/** Spec INC AC5: `referenceMonth` and `paymentDate` are two independent `YYYY-MM-DD` values. */
export type RegisterIncomePaymentInput = {
  incomeSourceId: string;
  paymentDate: string;
  referenceMonth: string;
  amountReceived: number;
  notes: string | null;
};

/** Spec INC AC7. */
export type ChangeIncomeValueInput = {
  incomeSourceId: string;
  amount: number;
  expectedDay: number;
  validityStart: string;
  changeReason: string;
};

/** Invalidates the income month and the dashboard of the month an API response named. */
const invalidateMonthOf = (client: QueryClient, apiDate: string): Promise<void> => {
  const parts = fromApiDate(apiDate);

  if (parts === null) {
    return Promise.resolve();
  }

  return Promise.all([
    client.invalidateQueries({ queryKey: qk.incomeMonth(parts.year, parts.month) }),
    client.invalidateQueries({ queryKey: qk.dashboard(parts.year, parts.month) }),
  ]).then(() => undefined);
};

/** The one place the income month route is written. Shared by the month and by the series. */
const readIncomeMonth = (year: number, month: number): Promise<MonthlyIncome> =>
  get<MonthlyIncome>(`/income/${year}/${month}`);

export function useIncomeMonth(year: number, month: number): UseQueryResult<MonthlyIncome, Error> {
  return useQuery({
    queryKey: qk.incomeMonth(year, month),
    queryFn: () => readIncomeMonth(year, month),
  });
}

/**
 * The months behind the trend line in the income screen's `MonthNavigator`.
 *
 * The value of a month is `totalReceived` - what arrived, not `totalExpected`. The expected amount
 * is a forecast the screen already shows line by line; plotting it as history would draw months of
 * income that were never actually received.
 */
export function useIncomeMonthSeries(year: number, month: number): MonthValue[] {
  return useMonthSeries(year, month, {
    queryKey: qk.incomeMonth,
    queryFn: readIncomeMonth,
    value: (data) => data.totalReceived,
  });
}

export function useRegisterIncomeSource(): UseMutationResult<
  IncomeSource,
  Error,
  RegisterIncomeSourceInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterIncomeSourceInput) => post<IncomeSource>('/income', input),
    // A source is not scoped to one month: it belongs to the month it starts in and to every month
    // after, so the whole prefix is invalidated rather than one guessed month.
    onSuccess: () => client.invalidateQueries({ queryKey: qk.incomeMonths() }),
  });
}

export function useRegisterIncomePayment(): UseMutationResult<
  IncomePayment,
  Error,
  RegisterIncomePaymentInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterIncomePaymentInput) =>
      post<IncomePayment>('/income/payment', input),
    onSuccess: (payment) => invalidateMonthOf(client, payment.referenceMonth),
  });
}

export function useChangeIncomeValue(): UseMutationResult<
  IncomeSourceVersion,
  Error,
  ChangeIncomeValueInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeIncomeValueInput) => put<IncomeSourceVersion>('/income/value', input),
    onSuccess: (version) => invalidateMonthOf(client, version.validityStart),
  });
}
