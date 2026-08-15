/**
 * The income contracts, mirroring the API's shapes field for field, plus the status labels spec
 * INC AC2 names.
 *
 * `expectedAmount` and `expectedDay` are `number | null` rather than plain numbers: a Variable source
 * has no version, so the API sends null for both. Null and zero are different facts — one says "no
 * amount is expected", the other says "zero is expected" — and collapsing them is what would make a
 * variable source read as an unpaid bill of R$ 0,00.
 */

/** `IncomeStatus` on the wire: 0 Pending, 1 Received, 2 Divergent. */
export type IncomeStatus = 0 | 1 | 2;

/** `IncomeType` on the wire: 0 Recurring, 1 Variable. */
export type IncomeType = 0 | 1;

/**
 * Spec INC AC2.
 *
 * Income and expense share these three integers and differ in the middle word: income is `Recebido`,
 * an expense is `Pago`. This map is income's alone (T31 writes the expense one) so a rename on one
 * side cannot silently retitle the other.
 *
 * `IncomeStatus` being the union `0 | 1 | 2` makes the record exhaustive by the type checker: leaving
 * a branch out is a compile error rather than a runtime default nobody looked at.
 */
export const INCOME_STATUS_LABEL: Record<IncomeStatus, string> = {
  0: 'Pendente',
  1: 'Recebido',
  2: 'Divergente',
};

/** `ResponseMonthlyIncomeLineJson`. */
export type MonthlyIncomeLine = {
  incomeSourceId: string;
  name: string;
  type: IncomeType;
  personId: string;
  expectedAmount: number | null;
  expectedDay: number | null;
  receivedAmount: number;
  status: IncomeStatus;
};

/** `ResponseMonthlyIncomeJson`. `referenceMonth` is a `YYYY-MM-DD` string, never a `Date`. */
export type MonthlyIncome = {
  referenceMonth: string;
  totalExpected: number;
  totalReceived: number;
  lines: MonthlyIncomeLine[];
};

/** `ResponseIncomeSourceJson`. `amount` and `expectedDay` are null for a Variable source. */
export type IncomeSource = {
  id: string;
  name: string;
  type: IncomeType;
  personId: string;
  archived: boolean;
  amount: number | null;
  expectedDay: number | null;
};

/** `ResponseIncomePaymentJson`. Both dates are `YYYY-MM-DD` strings and are independent of each other. */
export type IncomePayment = {
  id: string;
  incomeSourceId: string;
  incomeSourceVersionId: string | null;
  paymentDate: string;
  referenceMonth: string;
  amountReceived: number;
  notes: string | null;
};

/** `ResponseIncomeSourceVersionJson`, the answer to a value change. */
export type IncomeSourceVersion = {
  id: string;
  incomeSourceId: string;
  amount: number;
  expectedDay: number;
  validityStart: string;
  validityEnd: string | null;
  changeReason: string;
};
