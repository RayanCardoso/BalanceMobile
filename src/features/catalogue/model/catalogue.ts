/**
 * The three catalogue contracts, mirroring the API's response shapes field for field.
 *
 * `description` is `string | null` rather than optional: the API sends the key with a null value, and
 * a screen that treated absent and null differently would render "undefined" for one of them.
 */

/** `ResponsePersonJson`. */
export type Person = {
  id: string;
  name: string;
  description: string | null;
  isAccountOwner: boolean;
};

/**
 * `ExpensePriority` on the wire: 0 Essential, 1 Important, 2 Superfluous.
 *
 * A union rather than `number`, so the label map T22 builds on it is exhaustive by the type checker
 * instead of by a default branch that would quietly cover a value nobody looked at.
 */
export type CategoryPriority = 0 | 1 | 2;

/** `ResponseCategoryJson`. */
export type Category = {
  id: string;
  name: string;
  description: string | null;
  priority: CategoryPriority;
};

/**
 * `ResponseAccountJson`.
 *
 * `closingDay`, `dueDay` and `limit` describe a credit card. An account that is not one carries null
 * in all three (spec CAT AC4), which is why none of them is a plain `number`.
 */
export type Account = {
  id: string;
  name: string;
  institution: string;
  personId: string;
  closingDay: number | null;
  dueDay: number | null;
  limit: number | null;
};
