import { PRIORITY_LABEL } from '@/types/priority';
import {
  EXPENSE_STATUS_LABEL,
  EXPENSE_TYPE_LABEL,
  type ExpensePriority,
  type ExpenseStatus,
  type ExpenseType,
} from '@/types/expense';

/**
 * Spec REC AC9 — "label it Pendente, Pago or Divergente".
 *
 * One fixture per branch with a literal expected string (lesson L-005, L-010). A table-driven test
 * built from the map itself would agree with any wording the map happened to hold.
 */
describe('the expense status labels', () => {
  it('labels status 0 Pendente', () => {
    expect(EXPENSE_STATUS_LABEL[0]).toBe('Pendente');
  });

  it('labels status 1 Pago', () => {
    expect(EXPENSE_STATUS_LABEL[1]).toBe('Pago');
  });

  it('labels status 2 Divergente', () => {
    expect(EXPENSE_STATUS_LABEL[2]).toBe('Divergente');
  });

  // Income and expense carry the same integers and different words. Status 1 is where they part, so
  // it is pinned in both directions: income's `Recebido` reaching this map would be a real defect
  // that a positive-only assertion on the other two branches would not catch.
  it('does not label status 1 Recebido, which is the income wording', () => {
    expect(EXPENSE_STATUS_LABEL[1]).not.toBe('Recebido');
  });

  it('covers every status the wire can carry', () => {
    const statuses: ExpenseStatus[] = [0, 1, 2];

    expect(statuses.map((status) => EXPENSE_STATUS_LABEL[status])).toEqual([
      'Pendente',
      'Pago',
      'Divergente',
    ]);
  });
});

describe('the expense type labels', () => {
  it('labels type 0 Crédito', () => {
    expect(EXPENSE_TYPE_LABEL[0]).toBe('Crédito');
  });

  it('labels type 1 Débito', () => {
    expect(EXPENSE_TYPE_LABEL[1]).toBe('Débito');
  });

  it('labels type 2 Pix', () => {
    expect(EXPENSE_TYPE_LABEL[2]).toBe('Pix');
  });

  it('covers every type the wire can carry', () => {
    const types: ExpenseType[] = [0, 1, 2];

    expect(types.map((type) => EXPENSE_TYPE_LABEL[type])).toEqual(['Crédito', 'Débito', 'Pix']);
  });
});

/**
 * An expense line's `categoryPriority` is the same enum a category carries, so it reads through the
 * catalogue's map rather than a second copy. The three branches are pinned here because this is the
 * task that names them for the expense side; a divergent copy would show a different word for the
 * same integer depending on which screen the user was on.
 */
describe('the priority labels an expense line reads', () => {
  it('labels priority 0 Essencial', () => {
    const priority: ExpensePriority = 0;

    expect(PRIORITY_LABEL[priority]).toBe('Essencial');
  });

  it('labels priority 1 Importante', () => {
    const priority: ExpensePriority = 1;

    expect(PRIORITY_LABEL[priority]).toBe('Importante');
  });

  it('labels priority 2 Supérfluo', () => {
    const priority: ExpensePriority = 2;

    expect(PRIORITY_LABEL[priority]).toBe('Supérfluo');
  });
});
