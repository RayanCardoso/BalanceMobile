/**
 * The recurring-bill contracts, mirroring the API's shapes field for field.
 *
 * A recurring bill is not one value: it is a **timeline of versions**, each holding the amount that
 * was in effect from its `validityStart` until the day before the next one starts. That is why a
 * re-price is forward-looking (spec REC AC6) and why an already recorded payment keeps pointing at
 * the version it was measured against.
 *
 * The monthly line a screen reads lives in `features/expenses/model/expense.ts`, because it arrives
 * inside the monthly expense response. This module holds what the writes send and get back.
 */

/** `ResponseRecurringExpenseVersionJson`. `validityEnd` is null while this version is in effect. */
export type RecurringExpenseVersion = {
  id: string;
  recurringExpenseId: string;
  amount: number;
  validityStart: string;
  validityEnd: string | null;
  changeReason: string;
};

/**
 * `ResponseRecurringExpenseJson`. The value history is ordered oldest first, so the version a change
 * just created is the last one and the version a registration created is the only one.
 */
export type RecurringExpense = {
  id: string;
  name: string;
  personId: string;
  categoryId: string;
  accountId: string;
  dueDay: number;
  isEstimate: boolean;
  archived: boolean;
  versions: RecurringExpenseVersion[];
};

/**
 * `ResponseRecurringExpensePaymentJson`.
 *
 * `referenceMonth` is the month the bill belongs to and `paymentDate` is the day it was paid: a bill
 * for August settled on 3 September carries both, and the month to refresh is the reference one.
 */
export type RecurringExpensePayment = {
  id: string;
  recurringExpenseId: string;
  recurringExpenseVersionId: string;
  referenceMonth: string;
  paymentDate: string;
  amountPaid: number;
  notes: string | null;
  accountId: string | null;
};
