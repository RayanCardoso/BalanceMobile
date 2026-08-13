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
