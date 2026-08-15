import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  Expense,
  ExpenseType,
  InstallmentPlan,
  MonthlyExpense,
} from '@/types/expense';
import { get, post } from '@/services/api';
import { qk } from '@/services/queryKeys';
import { fromApiDate } from '@/utils/dates';

/**
 * The expense month and the two writes against it.
 *
 * **MAD-003 is the whole point of this module.** A registered expense belongs to the month the API
 * says it belongs to: a credit purchase on the 21st against an account closing on the 20th lands in
 * the *next* month. What gets invalidated is `response.competenceMonth`, never the month the screen
 * happened to be showing and never the purchase date's month. Invalidating the visible month would
 * re-read a list the expense is not in, and the user would watch it vanish.
 *
 * The client derives no competence month of its own (MAD-001): `competenceMonth` is null in the
 * request unless the user explicitly overrode it (spec EXP AC3, AC4).
 */

/** Spec EXP AC2 and AC3/AC4: `competenceMonth` is null unless the user chose to override it. */
export type RegisterExpenseInput = {
  name: string;
  personId: string;
  type: ExpenseType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  competenceMonth: string | null;
};

/** Spec INST AC1. The API splits the total and derives every installment's month. */
export type RegisterInstallmentPlanInput = {
  name: string;
  personId: string;
  totalAmount: number;
  installmentCount: number;
  categoryId: string;
  accountId: string;
  startDate: string;
};

/** Invalidates the expense month and the dashboard of the month an API response named. */
const invalidateMonthsOf = (client: QueryClient, apiDates: string[]): Promise<void> => {
  const keys = new Map<string, { year: number; month: number }>();

  for (const apiDate of apiDates) {
    const parts = fromApiDate(apiDate);

    if (parts !== null) {
      keys.set(`${parts.year}-${parts.month}`, { year: parts.year, month: parts.month });
    }
  }

  return Promise.all(
    [...keys.values()].flatMap(({ year, month }) => [
      client.invalidateQueries({ queryKey: qk.expenseMonth(year, month) }),
      client.invalidateQueries({ queryKey: qk.dashboard(year, month) }),
    ])
  ).then(() => undefined);
};

export function useExpenseMonth(year: number, month: number): UseQueryResult<MonthlyExpense, Error> {
  return useQuery({
    queryKey: qk.expenseMonth(year, month),
    queryFn: () => get<MonthlyExpense>(`/expense/${year}/${month}`),
  });
}

export function useRegisterExpense(): UseMutationResult<Expense, Error, RegisterExpenseInput> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterExpenseInput) => post<Expense>('/expense', input),
    // The month the API returned, not the input's date and not the month on screen (MAD-003).
    onSuccess: (expense) => invalidateMonthsOf(client, [expense.competenceMonth]),
  });
}

export function useRegisterInstallmentPlan(): UseMutationResult<
  InstallmentPlan,
  Error,
  RegisterInstallmentPlanInput
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInstallmentPlanInput) =>
      post<InstallmentPlan>('/expense/installment-plan', input),
    // One decision produces N charges across N months (spec INST AC2). Every month the generated
    // installments touch is refreshed; invalidating only the first would leave the rest stale.
    onSuccess: (plan) =>
      invalidateMonthsOf(
        client,
        plan.installments.map((installment) => installment.competenceMonth)
      ),
  });
}
