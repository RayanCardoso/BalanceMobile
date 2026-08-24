import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ExpenseMonthScreen } from '@/screens/Expense/ExpenseMonthScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * O `router` é o que as asserções do menu olham: para onde uma opção leva, e com qual conta, é a
 * única coisa que o menu decide - o resto é da tela de destino.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { router } = require('expo-router') as { router: { push: jest.Mock } };

/** Pinned so every month label asserted below is a literal (lesson L-010). */
jest.mock('@/utils/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/dates'),
  currentMonth: () => ({ year: 2026, month: 8 }),
}));

const BASE = 'http://10.0.2.2:5126/api';

const fetchMock = jest.fn();

const stubs = new Map<string, { status: number; body: unknown }>();

const stub = (method: string, path: string, status: number, body: unknown): void => {
  stubs.set(`${method} ${BASE}${path}`, { status, body });
};

const market = {
  expenseId: 'e1',
  name: 'Mercado',
  type: 1,
  amount: 320.5,
  date: '2026-08-12',
  personId: 'p1',
  categoryId: 'c1',
  categoryName: 'Alimentação',
  categoryPriority: 0,
  accountId: 'a1',
  accountName: 'Nubank',
  installmentNumber: null,
  installmentCount: null,
  installmentPlanId: null,
};

/** One installment of a three-part plan (spec INST AC3). */
const notebook = {
  ...market,
  expenseId: 'e2',
  name: 'Notebook',
  type: 0,
  amount: 33.33,
  installmentNumber: 2,
  installmentCount: 3,
  installmentPlanId: 'plan1',
};

/** An estimated bill that has not arrived: the expected figure is provisional (spec REC AC2). */
const energy = {
  recurringExpenseId: 'r1',
  name: 'Energia',
  personId: 'p1',
  categoryId: 'c2',
  accountId: 'a1',
  type: 1,
  dueDay: 10,
  isEstimate: true,
  expectedAmount: 150,
  actualAmount: null,
  paymentDate: null,
  paymentId: null,
  notes: null,
  status: 0 as const,
};

/** The same bill once 187,40 has been recorded: the figure is a fact and the status diverges. */
const energyPaid = {
  ...energy,
  actualAmount: 187.4,
  paymentDate: '2026-08-09',
  paymentId: 'pay1',
  status: 2 as const,
};

/** A bill whose amount is fixed, not estimated: never provisional, even before it is paid. */
const rent = {
  ...energy,
  recurringExpenseId: 'r2',
  name: 'Aluguel',
  dueDay: 31,
  isEstimate: false,
  expectedAmount: 2200,
};

const monthBody = (
  variableLines: unknown[],
  recurringLines: unknown[],
  totalCommitted = 470.5
) => ({
  competenceMonth: '2026-08-01',
  variableLines,
  recurringLines,
  totalVariable: 320.5,
  totalRecurringExpected: 150,
  totalRecurringPaid: 0,
  totalCommitted,
});

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <ExpenseMonthScreen />
    </Wrapper>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  stubs.clear();
  fetchMock.mockReset();
  router.push.mockClear();
  fetchMock.mockImplementation(async (url: string, init: { method: string }) => {
    const found = stubs.get(`${init.method} ${url}`);

    if (found === undefined) {
      throw new Error(`no stub for ${init.method} ${url}`);
    }

    return {
      status: found.status,
      ok: found.status >= 200 && found.status < 300,
      json: async () => found.body,
    };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useSessionStore.setState({ token: 'issued-token', name: 'Rayan', status: 'signedIn' });
  client = createTestQueryClient();
});

afterEach(() => {
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

/**
 * Spec EXP AC1 - "show the month's variable expenses and its recurring bills as separate groups".
 *
 * Each line is asserted **inside its own group**, so a screen rendering everything in one list would
 * fail rather than satisfy a page-wide text query.
 */
describe('the two groups (spec EXP AC1)', () => {
  it('puts variable expenses in one group and recurring bills in the other', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], [energy]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('variable-line-list')).toBeTruthy();
    });

    expect(within(screen.getByTestId('variable-line-list')).getByText('Mercado')).toBeTruthy();
    expect(within(screen.getByTestId('recurring-line-list')).getByText('Energia')).toBeTruthy();

    expect(within(screen.getByTestId('variable-line-list')).queryByText('Energia')).toBeNull();
    expect(within(screen.getByTestId('recurring-line-list')).queryByText('Mercado')).toBeNull();
  });

  // Lesson L-004: the fields the user reads are asserted per line, not only the group headings.
  it('shows a variable line with its type, amount, category and date', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], []));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('variable-line-e1')).toBeTruthy();
    });

    expect(within(screen.getByTestId('variable-type-e1')).getByText('Débito')).toBeTruthy();
    expect(within(screen.getByTestId('variable-amount-e1')).getByText('R$ 320,50')).toBeTruthy();
    expect(
      within(screen.getByTestId('variable-category-e1')).getByText('Alimentação · Essencial')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('variable-date-e1')).getByText('2026-08-12 · Nubank')
    ).toBeTruthy();
  });

  // Spec INST AC3 - "show its position as its number out of the plan's total".
  it('shows an installment line with its position in the plan', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market, notebook], []));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('variable-line-e2')).toBeTruthy();
    });

    expect(
      within(screen.getByTestId('variable-installment-e2')).getByText('Parcela 2 de 3')
    ).toBeTruthy();
    // A one-off purchase carries no position at all rather than "Parcela 1 de 1".
    expect(screen.queryByTestId('variable-installment-e1')).toBeNull();
  });
});

/**
 * Spec REC AC2 - "WHEN a recurring line's amount is an estimate and no payment exists for that month
 * THEN the system SHALL mark the figure as provisional".
 *
 * Three fixtures, because the criterion has two conditions: estimated and unpaid marks the figure,
 * estimated and paid does not, and a fixed amount never does. A screen marking every estimate would
 * pass the first assertion alone.
 */
describe('a provisional recurring figure (spec REC AC2)', () => {
  it('marks an estimated bill that has not been paid', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energy]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-line-r1')).toBeTruthy();
    });

    expect(screen.getByTestId('recurring-provisional-r1')).toBeTruthy();
    expect(within(screen.getByTestId('recurring-amount-r1')).getByText('R$ 150,00')).toBeTruthy();
    expect(within(screen.getByTestId('recurring-status-r1')).getByText('Pendente')).toBeTruthy();
  });

  it('drops the mark and shows the real value once the bill is paid', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energyPaid]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-line-r1')).toBeTruthy();
    });

    expect(screen.queryByTestId('recurring-provisional-r1')).toBeNull();
    expect(within(screen.getByTestId('recurring-amount-r1')).getByText('R$ 187,40')).toBeTruthy();
    // The estimate it replaced is gone, not shown beside it.
    expect(within(screen.getByTestId('recurring-amount-r1')).queryByText('R$ 150,00')).toBeNull();
    expect(within(screen.getByTestId('recurring-status-r1')).getByText('Divergente')).toBeTruthy();
  });

  it('never marks a bill whose amount is fixed rather than estimated', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [rent]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-line-r2')).toBeTruthy();
    });

    expect(screen.queryByTestId('recurring-provisional-r2')).toBeNull();
    expect(within(screen.getByTestId('recurring-amount-r2')).getByText('R$ 2.200,00')).toBeTruthy();
  });
});

/**
 * The due day is a pass-through field, and a wrong one shipped in the backend precisely because
 * totals were asserted and the field was not (lesson L-004). It is asserted per line here.
 */
describe('the due day of a recurring line', () => {
  it('shows each line its own due day', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energy, rent]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-line-r1')).toBeTruthy();
    });

    expect(within(screen.getByTestId('recurring-dueday-r1')).getByText('Vence dia 10')).toBeTruthy();
    // Spec edge case: a due day of 31 is shown as the API returned it, not clamped to the month.
    expect(within(screen.getByTestId('recurring-dueday-r2')).getByText('Vence dia 31')).toBeTruthy();
    expect(within(screen.getByTestId('recurring-dueday-r1')).queryByText('Vence dia 31')).toBeNull();
  });
});

/**
 * Spec edge case - "WHEN a recurring bill has no version in effect for a month THEN the system SHALL
 * show its expected amount as absent rather than as zero". Null and zero are different facts.
 */
describe('a bill with no version in effect', () => {
  it('shows the expected amount as absent, not as R$ 0,00', async () => {
    stub(
      'GET',
      '/expense/2026/8',
      200,
      monthBody([], [{ ...energy, expectedAmount: null, isEstimate: false }])
    );
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-line-r1')).toBeTruthy();
    });

    expect(within(screen.getByTestId('recurring-amount-r1')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('recurring-amount-r1')).queryByText('R$ 0,00')).toBeNull();
  });
});

/** UX-01: the four states a list screen can be in. */
describe('the screen states', () => {
  it('shows a loading indicator before the month arrives', () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], [energy]));
    renderScreen();

    // Asserted in the first frame: an empty list must not stand in for "still loading".
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('variable-line-list')).toBeNull();
  });

  it('explains an empty month rather than showing a blank screen', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [], 0));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Nenhuma despesa neste mês. Registre uma compra ou cadastre uma conta recorrente para acompanhá-la aqui.'
        )
      ).toBeTruthy();
    });
  });

  it('shows the failure and re-reads the month when the retry is pressed', async () => {
    stub('GET', '/expense/2026/8', 500, {});
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar as despesas do mês.')).toBeTruthy();
    });

    // The retry is pinned by what it does, not by being on screen: a control rendered without its
    // handler wired looks identical.
    stub('GET', '/expense/2026/8', 200, monthBody([market], [energy]));
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(within(screen.getByTestId('variable-line-list')).getByText('Mercado')).toBeTruthy();
    });
  });

  it('loads the month the navigator moves to', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], []));
    stub('GET', '/expense/2026/9', 200, monthBody([notebook], []));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Agosto de 2026')).toBeTruthy();
    });

    // A tendência não tem setas: cada mês da linha é o próprio alvo.
    fireEvent.press(screen.getByLabelText(/^Setembro de 2026,/));

    await waitFor(() => {
      expect(within(screen.getByTestId('variable-line-list')).getByText('Notebook')).toBeTruthy();
    });

    expect(screen.getByText('Setembro de 2026')).toBeTruthy();
  });
});

/**
 * Spec REC AC3, AC4 e AC6 alcançados de onde a conta está sendo lida.
 *
 * `paymentId` é o que decide qual verbo o menu oferece, porque é o mesmo campo que a tela de destino
 * lê para escolher entre POST e PUT: oferecer "Registrar pagamento" numa conta já paga levaria a um
 * `PAYMENT_ALREADY_RECORDED`, e é por isso que os dois rótulos são asserção separada e não uma só.
 */
describe('o menu de uma conta recorrente', () => {
  const openMenu = async (id: string): Promise<void> => {
    await waitFor(() => {
      expect(screen.getByTestId(`recurring-line-${id}`)).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId(`recurring-menu-${id}`));
  };

  it('leva ao pagamento da conta escolhida, no mês que está na tela', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energy]));
    renderScreen();

    await openMenu('r1');
    fireEvent.press(screen.getByLabelText('Registrar pagamento'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/expenses/recurring/payment',
      params: { recurringExpenseId: 'r1', year: 2026, month: 8 },
    });
  });

  it('oferece corrigir, e não registrar, quando o mês já tem pagamento', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energyPaid]));
    renderScreen();

    await openMenu('r1');

    expect(screen.getByLabelText('Corrigir pagamento')).toBeTruthy();
    expect(screen.queryByLabelText('Registrar pagamento')).toBeNull();
  });

  it('leva à alteração do valor base carregando a conta junto', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energy]));
    renderScreen();

    await openMenu('r1');
    fireEvent.press(screen.getByLabelText('Alterar valor'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/expenses/recurring/change-value',
      params: { recurringExpenseId: 'r1' },
    });
  });

  // Cada linha manda a sua própria conta: um menu que fechasse sobre a última renderizada mandaria
  // sempre a mesma, e as duas telas de destino agiriam sobre a conta errada.
  it('manda a conta da linha em que foi aberto, e não a de outra', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([], [energy, rent]));
    renderScreen();

    await openMenu('r2');
    fireEvent.press(screen.getByLabelText('Alterar valor'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/expenses/recurring/change-value',
      params: { recurringExpenseId: 'r2' },
    });
  });
});

/**
 * Lançar deixou de ser três botões dentro de um cartão de resumo e passou a ser o mesmo botão
 * flutuante do Resumo, pedindo só o que é despesa. O que esta tela prova é o recorte: uma receita
 * lançada a partir de Despesas seria a folha do Resumo em lugar errado.
 */
describe('o botão de adicionar da tela', () => {
  it('oferece os três lançamentos de despesa e nenhum outro', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], [energy]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('variable-line-list')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('add-menu-trigger'));

    ['Nova despesa variável', 'Nova despesa recorrente', 'Novo parcelamento'].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeTruthy();
    });

    expect(screen.queryByLabelText('Nova receita')).toBeNull();
  });

  it('leva ao cadastro escolhido', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([market], [energy]));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('variable-line-list')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('add-menu-trigger'));
    fireEvent.press(screen.getByLabelText('Nova despesa recorrente'));

    expect(router.push).toHaveBeenCalledWith('/expenses/recurring/new');
  });
});

