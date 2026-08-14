import { formatMoney, parseMoneyInput, parseOptionalInt } from '@/shared/lib/money';

/**
 * Imported through the `@/` alias on purpose: this is what proves T3's mapping resolves under Jest.
 *
 * Every expected value below is a literal. Calling `Intl.NumberFormat` inside an assertion would
 * mirror the implementation instead of pinning it, and would pass under any wrong output the same
 * call produced (lesson L-010).
 */
describe('formatMoney', () => {
  it('formats a grouped value in pt-BR', () => {
    expect(formatMoney(1234.56)).toBe('R$ 1.234,56');
  });

  it('formats zero with both decimal places', () => {
    expect(formatMoney(0)).toBe('R$ 0,00');
  });

  it('keeps a negative value negative rather than absolute', () => {
    expect(formatMoney(-45.9)).toBe('-R$ 45,90');
  });

  it('pads a value that has only one decimal place', () => {
    expect(formatMoney(1234.5)).toBe('R$ 1.234,50');
  });
});

describe('parseMoneyInput', () => {
  it('accepts a comma as the decimal separator', () => {
    expect(parseMoneyInput('1234,56')).toBe(1234.56);
  });

  it('accepts a dot as the decimal separator', () => {
    expect(parseMoneyInput('1234.56')).toBe(1234.56);
  });

  it.each([
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['letters', 'abc'],
    ['a currency prefix', 'R$ 10'],
    ['two separators', '12,34,56'],
    ['a bare separator', ','],
  ])('rejects %s', (_label, input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

describe('parseOptionalInt', () => {
  // Spec CAT AC4: an empty closing day, due day or limit must succeed. `null` is the value the API's
  // `int?` expects for "not set" - distinct from the `NaN` a naive `Number('')` would produce.
  it.each([
    ['an empty string', ''],
    ['only whitespace', '   '],
  ])('treats %s as not set', (_label, input) => {
    expect(parseOptionalInt(input)).toBeNull();
  });

  it('parses a whole number', () => {
    expect(parseOptionalInt('20')).toBe(20);
  });

  it.each([
    ['a decimal', '20.5'],
    ['letters', 'abc'],
    ['a negative number', '-1'],
  ])('rejects %s', (_label, input) => {
    expect(parseOptionalInt(input)).toBeNull();
  });
});
