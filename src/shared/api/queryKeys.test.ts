import { qk } from '@/shared/api/queryKeys';

/**
 * Invalidation is the app's real state problem, and these factories are what makes it land. The
 * literal keys below anchor the value; the comparisons around them pin the two properties an
 * invalidation depends on - the same input reaching the same entry, and different inputs reaching
 * different ones.
 */
describe('the month-scoped factories', () => {
  it.each([
    ['dashboard', qk.dashboard(2026, 8), ['dashboard', 2026, 8]],
    ['incomeMonth', qk.incomeMonth(2026, 8), ['incomeMonth', 2026, 8]],
    ['expenseMonth', qk.expenseMonth(2026, 8), ['expenseMonth', 2026, 8]],
  ])('builds %s from its own name, the year and the month', (_name, key, expected) => {
    expect(key).toEqual(expected);
  });

  it('gives the same key for the same month, so a query and a mutation meet', () => {
    expect(qk.expenseMonth(2026, 8)).toEqual(qk.expenseMonth(2026, 8));
  });

  it('gives different keys for different months of the same year', () => {
    expect(qk.expenseMonth(2026, 8)).not.toEqual(qk.expenseMonth(2026, 9));
  });

  it('gives different keys for the same month of different years', () => {
    expect(qk.dashboard(2025, 12)).not.toEqual(qk.dashboard(2026, 12));
  });

  it('keeps the three month resources apart for one and the same month', () => {
    expect(qk.dashboard(2026, 8)).not.toEqual(qk.incomeMonth(2026, 8));
    expect(qk.dashboard(2026, 8)).not.toEqual(qk.expenseMonth(2026, 8));
    expect(qk.incomeMonth(2026, 8)).not.toEqual(qk.expenseMonth(2026, 8));
  });
});

describe('the income month prefix', () => {
  it('is the name alone', () => {
    expect(qk.incomeMonths()).toEqual(['incomeMonth']);
  });

  // Invalidating the prefix reaches every month only while it is the head of each month key. If the
  // two ever drifted apart, registering a source would refresh nothing and nothing would fail.
  it('is the head of a single income month key', () => {
    expect(qk.incomeMonth(2026, 8).slice(0, 1)).toEqual(qk.incomeMonths());
  });

  it('is not the head of the dashboard or the expense month', () => {
    expect(qk.dashboard(2026, 8).slice(0, 1)).not.toEqual(qk.incomeMonths());
    expect(qk.expenseMonth(2026, 8).slice(0, 1)).not.toEqual(qk.incomeMonths());
  });
});

describe('the expense month and dashboard prefixes', () => {
  it.each([
    ['expenseMonths', qk.expenseMonths(), ['expenseMonth']],
    ['dashboards', qk.dashboards(), ['dashboard']],
  ])('builds %s from the name alone', (_name, key, expected) => {
    expect(key).toEqual(expected);
  });

  // Archiving a bill invalidates these prefixes. They reach every month only while each is the head
  // of the matching month key; if they drifted apart, archiving would refresh nothing and nothing
  // would fail.
  it.each([
    ['expense month', qk.expenseMonth(2026, 8), qk.expenseMonths()],
    ['dashboard', qk.dashboard(2026, 8), qk.dashboards()],
  ])('is the head of a single %s key', (_name, monthKey, prefix) => {
    expect(monthKey.slice(0, 1)).toEqual(prefix);
  });

  it('keeps the two prefixes apart from each other and from the income month', () => {
    expect(qk.expenseMonths()).not.toEqual(qk.dashboards());
    expect(qk.expenseMonths()).not.toEqual(qk.incomeMonths());
    expect(qk.dashboards()).not.toEqual(qk.incomeMonths());
  });
});

describe('the catalogue list factories', () => {
  it.each([
    ['people', qk.people(), ['people']],
    ['categories', qk.categories(), ['categories']],
    ['accounts', qk.accounts(), ['accounts']],
  ])('builds %s from its own name', (_name, key, expected) => {
    expect(key).toEqual(expected);
  });

  it('gives the same key on every call, so a create invalidates the list a screen reads', () => {
    expect(qk.people()).toEqual(qk.people());
  });

  it('keeps the three catalogue lists apart', () => {
    expect(qk.people()).not.toEqual(qk.categories());
    expect(qk.people()).not.toEqual(qk.accounts());
    expect(qk.categories()).not.toEqual(qk.accounts());
  });
});

describe('the recurring expenses list factory', () => {
  it('builds from the name alone', () => {
    expect(qk.recurringExpenses()).toEqual(['recurringExpenses']);
  });

  it('gives the same key on every call, so a register or an archive invalidates what the list reads', () => {
    expect(qk.recurringExpenses()).toEqual(qk.recurringExpenses());
  });

  it('is not the same key as any catalogue list or month prefix', () => {
    expect(qk.recurringExpenses()).not.toEqual(qk.people());
    expect(qk.recurringExpenses()).not.toEqual(qk.expenseMonths());
    expect(qk.recurringExpenses()).not.toEqual(qk.dashboards());
  });
});
