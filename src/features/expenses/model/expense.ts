import type { CategoryPriority } from '@/features/catalogue/model/catalogue';

/**
 * The expense contracts, mirroring the API's shapes field for field, plus the labels spec EXP AC1
 * and the recurring story name.
 *
 * `expectedAmount` and `actualAmount` are `number | null` on a recurring line, and they are different
 * facts: a month with no version in effect has no expected amount at all (spec edge case), and a bill
 * that has not arrived has no actual one. Collapsing either to zero would read as "R$ 0,00 was due"
 * and "R$ 0,00 was paid".
 */

/** `ExpenseStatus` on the wire: 0 Pending, 1 Paid, 2 Divergent. */
export type ExpenseStatus = 0 | 1 | 2;

/** `ExpenseType` on the wire: 0 Credit, 1 Debit, 2 Pix. */
export type ExpenseType = 0 | 1 | 2;

/**
 * The API's `ExpensePriority` is the same enum a category carries, so the label map is the
 * catalogue's `PRIORITY_LABEL` rather than a second copy here. One enum, one map: a rename would
 * otherwise have to be made twice and could be made once.
 */
export type ExpensePriority = CategoryPriority;

/**
 * Spec REC AC9 - "label it Pendente, Pago or Divergente".
 *
 * Income and expense share these three integers and differ in the middle word: an expense is `Pago`,
 * income is `Recebido`. This map is the expense side's alone (T25 wrote income's) so a rename on one
 * side cannot silently retitle the other.
 *
 * `ExpenseStatus` being the union `0 | 1 | 2` makes the record exhaustive by the type checker:
 * leaving a branch out is a compile error rather than a runtime default nobody looked at.
 */
export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  0: 'Pendente',
  1: 'Pago',
  2: 'Divergente',
};

/** How a purchase was paid, as the month screen and the register form name it. */
export const EXPENSE_TYPE_LABEL: Record<ExpenseType, string> = {
  0: 'Crédito',
  1: 'Débito',
  2: 'Pix',
};

export const EXPENSE_TYPE_OPTIONS: { label: string; value: ExpenseType }[] = [
  { label: 'Crédito', value: 0 },
  { label: 'Débito', value: 1 },
  { label: 'Pix', value: 2 },
];

/**
 * `ResponseVariableExpenseLineJson`.
 *
 * The three installment fields are null unless the expense is one installment of a plan; when they
 * are present the line shows its position as "number out of count" (spec INST AC3).
 */
export type VariableExpenseLine = {
  expenseId: string;
  name: string;
  type: ExpenseType;
  amount: number;
  date: string;
  personId: string;
  categoryId: string;
  categoryName: string;
  categoryPriority: ExpensePriority;
  accountId: string;
  accountName: string;
  installmentNumber: number | null;
  installmentCount: number | null;
  installmentPlanId: string | null;
};

/** `ResponseRecurringExpenseLineJson`. `paymentId` is what T49 added so a payment can be corrected. */
export type RecurringExpenseLine = {
  recurringExpenseId: string;
  name: string;
  personId: string;
  categoryId: string;
  accountId: string;
  dueDay: number;
  isEstimate: boolean;
  expectedAmount: number | null;
  actualAmount: number | null;
  paymentDate: string | null;
  paymentId: string | null;
  notes: string | null;
  status: ExpenseStatus;
};

/** `ResponseMonthlyExpenseJson`. `competenceMonth` is a `YYYY-MM-DD` string, never a `Date`. */
export type MonthlyExpense = {
  competenceMonth: string;
  variableLines: VariableExpenseLine[];
  recurringLines: RecurringExpenseLine[];
  totalVariable: number;
  totalRecurringExpected: number;
  totalRecurringPaid: number;
  totalCommitted: number;
};

/**
 * `ResponseExpenseJson`.
 *
 * `competenceMonth` is the server's answer to which month the expense belongs to (MAD-001). It is
 * what the app invalidates and what it tells the user about, never a month computed here.
 */
export type Expense = {
  id: string;
  name: string;
  personId: string;
  type: ExpenseType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  competenceMonth: string;
  installmentNumber: number | null;
  installmentPlanId: string | null;
};

/** `ResponseInstallmentPlanJson`. Each generated installment carries its own competence month. */
export type InstallmentPlan = {
  id: string;
  name: string;
  personId: string;
  totalAmount: number;
  installmentCount: number;
  categoryId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  installments: Expense[];
};
