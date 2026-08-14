/**
 * Every query key in the app is built here (MAD-002). A mutation has to invalidate the same key the
 * query registered under, and a key written out by hand at each call site is the classic reason a
 * screen does not refresh after a write: the two strings differ by a character and nothing fails.
 *
 * Each month-scoped factory takes the year and the month, so `expenseMonth(2026, 8)` and
 * `expenseMonth(2026, 9)` are separate cache entries. A factory that ignored an argument would make
 * every month share one entry, and recording an expense in August would appear to change September.
 */
export const qk = {
  dashboard: (year: number, month: number) => ['dashboard', year, month] as const,
  incomeMonth: (year: number, month: number) => ['incomeMonth', year, month] as const,
  expenseMonth: (year: number, month: number) => ['expenseMonth', year, month] as const,
  /**
   * Every income month at once. A write that is not scoped to a single month - registering a source,
   * which belongs to the month it starts in and to every month after it - invalidates this prefix
   * rather than guessing at one month and leaving the rest stale.
   */
  incomeMonths: () => ['incomeMonth'] as const,
  /**
   * Every expense month at once, and every dashboard at once. Archiving a recurring bill removes it
   * from past and future months alike, so it invalidates the whole prefix rather than the month that
   * happens to be on screen; a user scrolling back would otherwise read a month that still counts a
   * bill the API no longer returns.
   */
  expenseMonths: () => ['expenseMonth'] as const,
  dashboards: () => ['dashboard'] as const,
  people: () => ['people'] as const,
  categories: () => ['categories'] as const,
  accounts: () => ['accounts'] as const,
};
