import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { IncomeScreen } from '@/screens/Income/IncomeScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

// The screen opens on the current month. Pinning it makes every expected label a literal instead of
// a value recomputed from today's date, which would agree with the screen on any wrong answer.
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

/** Pending recurring source: 5000 expected, nothing received yet. */
const salary = {
  incomeSourceId: 's1',
  name: 'Salário',
  type: 0,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 0,
  status: 0,
};

/** Received recurring source: what was expected is what arrived. */
const rent = {
  incomeSourceId: 's2',
  name: 'Aluguel recebido',
  type: 0,
  personId: 'p1',
  expectedAmount: 1800,
  expectedDay: 10,
  receivedAmount: 1800,
  status: 1,
};

/** Divergent recurring source: something arrived, but not the expected amount. */
const bonus = {
  incomeSourceId: 's3',
  name: 'Comissão',
  type: 0,
  personId: 'p1',
  expectedAmount: 900,
  expectedDay: 20,
  receivedAmount: 745.5,
  status: 2,
};

/** Variable source: the API sends null for the expected amount, which is not the same as zero. */
const freelance = {
  incomeSourceId: 's4',
  name: 'Freelance',
  type: 1,
  personId: 'p1',
  expectedAmount: null,
  expectedDay: null,
  receivedAmount: 1200,
  status: 1,
};

const monthBody = (referenceMonth: string, lines: unknown[]) => ({
  referenceMonth,
  totalExpected: 7700,
  totalReceived: 3745.5,
  lines,
});

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <IncomeScreen />
    </Wrapper>
  );
};

/**
 * Each of the three fields spec INC AC1 names is queried inside its own subtree. `Recebido` is both
 * the label of the received figure and the label of status 1, so a row-wide query cannot tell an
 * amount heading from a status - which is exactly the ambiguity that would let a screen showing the
 * wrong status still pass.
 */
const expected = (id: string) => within(screen.getByTestId(`income-expected-${id}`));
const received = (id: string) => within(screen.getByTestId(`income-received-${id}`));
const status = (id: string) => within(screen.getByTestId(`income-status-${id}`));

beforeEach(() => {
  jest.clearAllMocks();
  stubs.clear();
  fetchMock.mockReset();
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

const openAugust = async (lines: unknown[]): Promise<void> => {
  stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', lines));
  renderScreen();

  await waitFor(() => {
    expect(screen.getByTestId('income-line-list')).toBeTruthy();
  });
};

describe('the four states of the income month', () => {
  it('shows a loading indicator while the first read is in flight', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary]));
    renderScreen();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeTruthy();
    });
  });

  it('explains a month with no income rather than showing a blank screen', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', []));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Nenhuma receita neste mês. Cadastre uma fonte de renda para acompanhá-la aqui.'
        )
      ).toBeTruthy();
    });
  });

  it('says the server could not be reached when the API is unreachable', async () => {
    // Spec UX AC5. A rejected `fetch` is `NetworkError`: the request never arrived, so the screen
    // must not show the same sentence a 500 produces, which is what it did before T45's sweep.
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        )
      ).toBeTruthy();
    });

    expect(screen.queryByText('Não foi possível carregar as receitas do mês.')).toBeNull();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('offers a retry when the read fails, and shows the month once it works', async () => {
    stub('GET', '/income/2026/8', 500, {});
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar as receitas do mês.')).toBeTruthy();
    });

    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary]));
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeTruthy();
    });
  });
});

/**
 * Spec INC AC1 and AC2. The criterion names three things per line, so each test makes three
 * assertions on that line's own subtree (lesson L-004): a screen showing only the total would satisfy
 * a totals assertion while leaving every line's status wrong.
 */
describe('what each line shows', () => {
  it('shows a pending source with its expected amount, nothing received and Pendente', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(expected('s1').getByText('R$ 5.000,00')).toBeTruthy();
    expect(received('s1').getByText('R$ 0,00')).toBeTruthy();
    expect(status('s1').getByText('Pendente')).toBeTruthy();
  });

  it('shows a fully received source with both amounts and Recebido', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(expected('s2').getByText('R$ 1.800,00')).toBeTruthy();
    expect(received('s2').getByText('R$ 1.800,00')).toBeTruthy();
    expect(status('s2').getByText('Recebido')).toBeTruthy();
  });

  it('shows a divergent source with the two different amounts and Divergente', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(expected('s3').getByText('R$ 900,00')).toBeTruthy();
    expect(received('s3').getByText('R$ 745,50')).toBeTruthy();
    expect(status('s3').getByText('Divergente')).toBeTruthy();
  });

  it('keeps each status on its own line rather than labelling them all alike', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(status('s1').queryByText('Recebido')).toBeNull();
    expect(status('s2').queryByText('Pendente')).toBeNull();
    expect(status('s3').queryByText('Recebido')).toBeNull();
  });
});

/**
 * A Variable source reports a null expected amount on the wire. The spec's edge case - "show its
 * expected amount as absent rather than as zero" - is what separates "nothing is expected here" from
 * "R$ 0,00 was expected and did not arrive".
 */
describe('a variable source, which has no expected amount', () => {
  it('renders the expected amount as absent, not as R$ 0,00', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(expected('s4').getByText('—')).toBeTruthy();
    expect(expected('s4').queryByText('R$ 0,00')).toBeNull();
  });

  it('still shows what it received and its status', async () => {
    await openAugust([salary, rent, bonus, freelance]);

    expect(received('s4').getByText('R$ 1.200,00')).toBeTruthy();
    expect(status('s4').getByText('Recebido')).toBeTruthy();
  });
});

describe('moving between months', () => {
  it('loads the next month and shows its own lines', async () => {
    await openAugust([salary]);

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();

    stub('GET', '/income/2026/9', 200, monthBody('2026-09-01', [freelance]));
    // A tendência não tem setas: cada mês da linha é o próprio alvo.
    fireEvent.press(screen.getByLabelText(/^Setembro de 2026,/));

    await waitFor(() => {
      expect(screen.getByText('Setembro de 2026')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText('Freelance')).toBeTruthy();
    });

    expect(screen.queryByText('Salário')).toBeNull();
  });
});
