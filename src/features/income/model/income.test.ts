import { INCOME_STATUS_LABEL, type IncomeStatus } from '@/features/income/model/income';

/**
 * Spec INC AC2 — "label it Pendente, Recebido or Divergente".
 *
 * One fixture per branch with a literal expected string (lesson L-005, L-010). A table-driven test
 * built from the map itself would agree with any wording the map happened to hold.
 */
describe('the income status labels', () => {
  it('labels status 0 Pendente', () => {
    expect(INCOME_STATUS_LABEL[0]).toBe('Pendente');
  });

  it('labels status 1 Recebido', () => {
    expect(INCOME_STATUS_LABEL[1]).toBe('Recebido');
  });

  it('labels status 2 Divergente', () => {
    expect(INCOME_STATUS_LABEL[2]).toBe('Divergente');
  });

  // Income and expense carry the same integers and different words. Status 1 is where they part, so
  // it is pinned in both directions: an expense's `Pago` reaching this map would be a real defect
  // that a positive-only assertion on the other two branches would not catch.
  it('does not label status 1 Pago, which is the expense wording', () => {
    expect(INCOME_STATUS_LABEL[1]).not.toBe('Pago');
  });

  it('covers every status the wire can carry', () => {
    const statuses: IncomeStatus[] = [0, 1, 2];

    expect(statuses.map((status) => INCOME_STATUS_LABEL[status])).toEqual([
      'Pendente',
      'Recebido',
      'Divergente',
    ]);
  });
});
