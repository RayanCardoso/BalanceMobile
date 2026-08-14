import type { MonthlyExpense } from '@/features/expenses/model/expense';
import type { MonthlyIncome } from '@/features/income/model/income';

/**
 * `ResponseMonthlyDashboardJson`. Both halves are the untouched responses of the monthly income and
 * monthly expense endpoints, so this type composes the two feature models rather than restating
 * their fields: a field added to either one reaches the dashboard without a second edit here.
 *
 * `balance` is the API's own subtraction (MAD-001). It arrives already signed, and a negative one is
 * money owed - the app renders the number it was given and never takes its absolute value
 * (spec DASH AC5).
 */
export type MonthlyDashboard = {
  competenceMonth: string;
  income: MonthlyIncome;
  expenses: MonthlyExpense;
  balance: number;
};
