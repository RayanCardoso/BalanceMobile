/**
 * Formatting is hand-rolled rather than delegated to `Intl.NumberFormat`. Two reasons: Hermes does
 * not guarantee the full ICU data a `pt-BR` currency format needs, so a device could silently fall
 * back to `en-US`; and the ICU output separates `R$` from the digits with a non-breaking space,
 * which makes the value differ from what the tests pin by an invisible character.
 */

/** `1234.56` becomes `R$ 1.234,56`; a negative value keeps its sign. */
export function formatMoney(value: number): string {
  const cents = Math.round(Math.abs(value) * 100);
  const units = Math.floor(cents / 100);
  const fraction = cents % 100;

  const grouped = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 ? '-' : '';

  return `${sign}R$ ${grouped},${String(fraction).padStart(2, '0')}`;
}

/**
 * Accepts a plain decimal written with either separator - `1234,56` and `1234.56` both give
 * `1234.56` - and returns null for anything else. This is the only client-side validation of an
 * amount: everything about whether the value is *allowed* belongs to the API.
 */
export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim();

  if (/^-?\d+(?:[.,]\d+)?$/.test(trimmed) === false) {
    return null;
  }

  return Number(trimmed.replace(',', '.'));
}

/**
 * For an optional whole-number field - an account's closing day or due day - where an empty input is
 * a valid "not set" rather than a rejected one. `parseOptionalInt('')` is `null`, distinct from the
 * `NaN` a bare `Number('')` coercion or a rejected non-integer would produce; the API's `int?` needs
 * exactly that distinction (spec CAT AC4).
 */
export function parseOptionalInt(input: string): number | null {
  const trimmed = input.trim();

  if (trimmed === '') {
    return null;
  }

  if (/^\d+$/.test(trimmed) === false) {
    return null;
  }

  return Number(trimmed);
}
