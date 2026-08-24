import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ExpenseType,
  RecurringExpense,
  RecurringExpensePayment,
} from '@/types/recurring';
import { get, post, put } from '@/services/api';
import { qk } from '@/services/queryKeys';
import { fromApiDate } from '@/utils/dates';

/**
 * The five writes against a recurring bill, and the four different cache scopes they have.
 *
 * A recurring bill is the app's most stateful object, and each write changes a different slice of
 * the timeline. Invalidating "the current month" everywhere would be wrong four times over:
 *
 * | Write | What it changes | What it invalidates |
 * | ----- | --------------- | ------------------- |
 * | register | the bill exists from its first version onward | every month from that `validityStart` on |
 * | record / correct a payment | one month's real cost | that payment's own `referenceMonth` |
 * | change the base value | the amount from the new version on; earlier months keep the old one | every month from the new `validityStart` on |
 * | archive / unarchive | whether the bill appears at all, in every month | every month the app has cached |
 *
 * Spec REC AC6 is the third row: "past months unaffected" is a statement about the cache as much as
 * about the data. A re-price that invalidated everything would make already-settled months re-read
 * for a change that cannot touch them.
 *
 * Every month figure comes from the API's own response (MAD-003), never from the input and never
 * from the month a screen happens to be showing.
 */

/** Spec REC AC1. The API defaults the first version's validity start to today when none is sent. */
export type RegisterRecurringExpenseInput = {
  name: string;
  personId: string;
  categoryId: string;
  accountId: string | null;
  dueDay: number;
  amount: number;
  isEstimate: boolean;
  type: ExpenseType;
};

/**
 * Spec REC AC3: the reference month is the bill's month, the payment date is the day it was paid.
 *
 * `type` is nullable because the API declares it nullable (`ExpenseType?`): it overrides the bill's
 * own payment type **for this month only**, and null means "keep the bill's own". Typing it as
 * required here would force every caller to invent a type it may not have been asked for.
 */
export type RegisterRecurringPaymentInput = {
  recurringExpenseId: string;
  referenceMonth: string;
  paymentDate: string;
  amountPaid: number;
  notes: string | null;
  accountId: string | null;
  type: ExpenseType | null;
};

/**
 * Spec REC AC5 - a correction carries only what was paid. `paymentId` addresses the payment in the
 * URL; the reference month and the frozen version are not the client's to move.
 *
 * `type` is the same per-month override the registration carries, and omitting it clears a previous
 * one - which is why it is sent explicitly rather than left out of the body.
 */
export type UpdateRecurringPaymentInput = {
  paymentId: string;
  paymentDate: string;
  amountPaid: number;
  notes: string | null;
  accountId: string | null;
  type: ExpenseType | null;
};

/** Spec REC AC6. */
export type ChangeRecurringValueInput = {
  recurringExpenseId: string;
  amount: number;
  validityStart: string;
  changeReason: string;
};

/** Spec REC AC7 and AC8: one operation, and the flag says which way. */
export type ArchiveRecurringExpenseInput = {
  recurringExpenseId: string;
  archived: boolean;
};

const [EXPENSE_MONTH_HEAD] = qk.expenseMonths();
const [DASHBOARD_HEAD] = qk.dashboards();

/** Invalidates the expense month and the dashboard of one month an API response named. */
const invalidateMonthOf = (client: QueryClient, apiDate: string): Promise<void> => {
  const parts = fromApiDate(apiDate);

  if (parts === null) {
    return Promise.resolve();
  }

  return Promise.all([
    client.invalidateQueries({ queryKey: qk.expenseMonth(parts.year, parts.month) }),
    client.invalidateQueries({ queryKey: qk.dashboard(parts.year, parts.month) }),
  ]).then(() => undefined);
};

/**
 * Invalidates every cached month from `apiDate`'s month onward, and no earlier one.
 *
 * The predicate reads the head of each key through the factories rather than through a literal
 * string, so a renamed resource cannot leave this matching nothing (MAD-002).
 */
const invalidateMonthsFrom = (client: QueryClient, apiDate: string): Promise<void> => {
  const parts = fromApiDate(apiDate);

  if (parts === null) {
    return Promise.resolve();
  }

  const first = parts.year * 12 + parts.month;

  return client.invalidateQueries({
    predicate: (query) => {
      const [head, year, month] = query.queryKey;

      if (head !== EXPENSE_MONTH_HEAD && head !== DASHBOARD_HEAD) {
        return false;
      }

      if (typeof year !== 'number' || typeof month !== 'number') {
        return false;
      }

      return year * 12 + month >= first;
    },
  });
};

/** Invalidates every expense month and every dashboard the app holds, past and future alike. */
const invalidateEveryMonth = (client: QueryClient): Promise<void> =>
  Promise.all([
    client.invalidateQueries({ queryKey: qk.expenseMonths() }),
    client.invalidateQueries({ queryKey: qk.dashboards() }),
  ]).then(() => undefined);

/** Spec REC-01/CAT-02's analogue for recurring bills: `GET /api/RecurringExpense`, archived or not. */
export function useRecurringExpenses(): UseQueryResult<RecurringExpense[], Error> {
  return useQuery({
    queryKey: qk.recurringExpenses(),
    queryFn: async (): Promise<RecurringExpense[]> =>
      (await get<{ recurringExpenses: RecurringExpense[] }>('/RecurringExpense')).recurringExpenses,
  });
}

export function useRegisterRecurringExpense(): UseMutationResult<
  RecurringExpense,
  Error,
  RegisterRecurringExpenseInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterRecurringExpenseInput) =>
      post<RecurringExpense>('/RecurringExpense', input),
    // The bill starts existing at its first version's validity start, which the API decides when the
    // request does not carry one. Months before it never showed the bill and do not now. The list
    // itself (T51) also needs a refresh - a new bill would otherwise not appear until the next reload.
    onSuccess: async (expense) => {
      const first = expense.versions[0];

      await Promise.all([
        client.invalidateQueries({ queryKey: qk.recurringExpenses() }),
        first === undefined ? Promise.resolve() : invalidateMonthsFrom(client, first.validityStart),
      ]);
    },
  });
}

export function useRegisterRecurringPayment(): UseMutationResult<
  RecurringExpensePayment,
  Error,
  RegisterRecurringPaymentInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterRecurringPaymentInput) =>
      post<RecurringExpensePayment>('/RecurringExpense/payment', input),
    // The month the payment refers to (MAD-003), not the day it was paid and not the month on screen.
    onSuccess: (payment) => invalidateMonthOf(client, payment.referenceMonth),
  });
}

export function useUpdateRecurringPayment(): UseMutationResult<
  RecurringExpensePayment,
  Error,
  UpdateRecurringPaymentInput
> {
  const client = useQueryClient();

  return useMutation({
    // Spec REC AC5 - the fields a correction may change, built here so no caller can widen it.
    mutationFn: (input: UpdateRecurringPaymentInput) =>
      put<RecurringExpensePayment>(`/RecurringExpense/payment/${input.paymentId}`, {
        paymentDate: input.paymentDate,
        amountPaid: input.amountPaid,
        notes: input.notes,
        accountId: input.accountId,
        type: input.type,
      }),
    onSuccess: (payment) => invalidateMonthOf(client, payment.referenceMonth),
  });
}

export function useChangeRecurringValue(): UseMutationResult<
  RecurringExpense,
  Error,
  ChangeRecurringValueInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeRecurringValueInput) =>
      put<RecurringExpense>('/RecurringExpense/value', input),
    // Spec REC AC6 - the new value is in effect from its own validity start. Earlier months keep
    // showing the version they were priced under, so they are left alone. The versions arrive oldest
    // first, so the one this change created is the last.
    onSuccess: (expense) => {
      const created = expense.versions[expense.versions.length - 1];

      return created === undefined
        ? Promise.resolve()
        : invalidateMonthsFrom(client, created.validityStart);
    },
  });
}

export function useArchiveRecurringExpense(): UseMutationResult<
  null,
  Error,
  ArchiveRecurringExpenseInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: ArchiveRecurringExpenseInput) =>
      put<null>(`/RecurringExpense/${input.recurringExpenseId}/archive?archived=${input.archived}`),
    // Spec REC AC7 and AC8. A bill leaves - or rejoins - every month at once, so every cached month
    // is stale, including months the user has already scrolled past. The list itself (T51) carries
    // the flag this toggle just flipped, so it is invalidated too.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: qk.recurringExpenses() }),
        invalidateEveryMonth(client),
      ]),
  });
}
