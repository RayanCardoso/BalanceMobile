import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

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

/** A source that pays the same amount every month (`type: 0`). */
const salary = {
  incomeSourceId: 'i1',
  name: 'Salário',
  type: 0 as const,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 4800,
  status: 2 as const,
};

/** A source with no expected amount at all (`type: 1`). */
const freelance = {
  incomeSourceId: 'i2',
  name: 'Freela',
  type: 1 as const,
  personId: 'p1',
  expectedAmount: null,
  expectedDay: null,
  receivedAmount: 1200,
  status: 1 as const,
};

const market = {
  expenseId: 'e1',
  name: 'Mercado',
  type: 1 as const,
  amount: 320.5,
  date: '2026-08-12',
  personId: 'p1',
  categoryId: 'c1',
  categoryName: 'Alimentação',
  categoryPriority: 0 as const,
  accountId: 'a1',
  accountName: 'Nubank',
  installmentNumber: null,
  installmentCount: null,
  installmentPlanId: null,
};

/** An estimated bill that has not arrived: the expected figure stands in for the actual one. */
const energy = {
  recurringExpenseId: 'r1',
  name: 'Energia',
  personId: 'p1',
  categoryId: 'c2',
  accountId: 'a1',
  dueDay: 10,
  isEstimate: true,
  expectedAmount: 150,
  actualAmount: null,
  paymentDate: null,
  paymentId: null,
  notes: null,
  status: 0 as const,
};

const dashboardBody = ({
  competenceMonth,
  incomeLines = [],
  variableLines = [],
  recurringLines = [],
  totalReceived = 0,
  totalCommitted = 0,
  balance = 0,
}: {
  competenceMonth: string;
  incomeLines?: unknown[];
  variableLines?: unknown[];
  recurringLines?: unknown[];
  totalReceived?: number;
  totalCommitted?: number;
  balance?: number;
}) => ({
  competenceMonth,
  income: {
    referenceMonth: competenceMonth,
    totalExpected: 5000,
    totalReceived,
    lines: incomeLines,
  },
  expenses: {
    competenceMonth,
    variableLines,
    recurringLines,
    totalVariable: 320.5,
    totalRecurringExpected: 150,
    totalRecurringPaid: 0,
    totalCommitted,
  },
  balance,
});

/** August as the seeded fixture reads it: more came in than the month costs. */
const august = dashboardBody({
  competenceMonth: '2026-08-01',
  incomeLines: [salary, freelance],
  variableLines: [market],
  recurringLines: [energy],
  totalReceived: 6000,
  totalCommitted: 470.5,
  balance: 5529.5,
});

/** September: nothing has been received yet and the recurring bill is already committed. */
const september = dashboardBody({
  competenceMonth: '2026-09-01',
  recurringLines: [energy],
  totalReceived: 0,
  totalCommitted: 470.5,
  balance: -470.5,
});

/** A month before anything was recorded. Every figure is zero, and no line exists at all. */
const emptyMonth = dashboardBody({ competenceMonth: '2026-08-01' });

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <DashboardScreen />
    </Wrapper>
  );
};

/**
 * The balance the screen prints, read inside its own card.
 *
 * The trend line above spells out the selected month's balance as well, so a page-wide query for the
 * amount now matches twice - and "the amount is somewhere on screen" was never the claim these tests
 * were making.
 */
const balanceShows = (amount: string) =>
  within(screen.getByTestId('dashboard-balance')).getByText(amount);

beforeEach(() => {
  jest.clearAllMocks();
  stubs.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init: { method: string }) => {
    const key = `${init.method} ${url}`;

    const found = stubs.get(key);

    if (found === undefined) {
      throw new Error(`no stub for ${key}`);
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

describe('the month at a glance (spec DASH AC1)', () => {
  it('opens on the current month and shows what came in, what it costs and what is left', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-balance')).toBeTruthy();
    });

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-total-received')).getByText('R$ 6.000,00')).toBeTruthy();
    expect(
      within(screen.getByTestId('dashboard-total-committed')).getByText('R$ 470,50')
    ).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-balance')).getByText('R$ 5.529,50')).toBeTruthy();
  });
});

/**
 * Spec DASH AC6 - "recurring income, variable income, recurring expenses and variable expenses as
 * four distinguishable groups". Each line is asserted **inside its own group** and denied in the
 * others, so a screen rendering everything in one list fails rather than passing a page-wide query.
 */
describe('the four groups (spec DASH AC6)', () => {
  it('puts each line in the group its own type names', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('group-recurring-income')).toBeTruthy();
    });

    expect(within(screen.getByTestId('group-recurring-income')).getByText('Salário')).toBeTruthy();
    expect(within(screen.getByTestId('group-variable-income')).getByText('Freela')).toBeTruthy();
    expect(within(screen.getByTestId('group-recurring-expenses')).getByText('Energia')).toBeTruthy();
    expect(within(screen.getByTestId('group-variable-expenses')).getByText('Mercado')).toBeTruthy();

    // A recurring source in the variable group would mean the split ignored the line's `type`.
    expect(within(screen.getByTestId('group-variable-income')).queryByText('Salário')).toBeNull();
    expect(within(screen.getByTestId('group-recurring-income')).queryByText('Freela')).toBeNull();
    expect(within(screen.getByTestId('group-variable-expenses')).queryByText('Energia')).toBeNull();
    expect(within(screen.getByTestId('group-recurring-expenses')).queryByText('Mercado')).toBeNull();
  });

  // Lesson L-004: the figure the user reads on each line, not only the totals above them.
  it('shows each line with the amount it carries', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-income-i1')).toBeTruthy();
    });

    expect(within(screen.getByTestId('dashboard-income-i1')).getByText('R$ 4.800,00')).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-income-i2')).getByText('R$ 1.200,00')).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-expense-e1')).getByText('R$ 320,50')).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-expense-r1')).getByText('R$ 150,00')).toBeTruthy();
  });
});

describe('moving between months (spec DASH AC2)', () => {
  it('loads and shows the month moved to', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);
    renderScreen();

    await waitFor(() => {
      expect(balanceShows('R$ 5.529,50')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    await waitFor(() => {
      expect(screen.getByText('Setembro de 2026')).toBeTruthy();
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId('dashboard-total-committed')).getByText('R$ 470,50')
      ).toBeTruthy();
    });

    expect(within(screen.getByTestId('dashboard-total-received')).getByText('R$ 0,00')).toBeTruthy();
  });

  /**
   * Spec DASH AC3 - "rather than stale figures from another month". August's balance surviving under
   * a September heading is the failure the criterion names, and it is what is asserted here.
   *
   * What is deliberately *not* asserted any more is a loading indicator on the way. The trend line
   * reads the months around the current one through the same key `useDashboard` uses, so a neighbour
   * is already in the cache by the time the user moves onto it and its real figures are on screen in
   * the same frame. There is nothing stale in that - the figures shown belong to September - and a
   * test demanding a spinner would be pinning a gap the window exists to close.
   */
  it('never shows the previous month figures under the new month heading', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);
    renderScreen();

    await waitFor(() => {
      expect(balanceShows('R$ 5.529,50')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    // Asserted synchronously, with no `await` in between: the stubbed response resolves on a
    // microtask, which cannot run while this block is still executing.
    expect(screen.getByText('Setembro de 2026')).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-balance')).queryByText('R$ 5.529,50')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-balance')).toBeTruthy();
    });
  });

  /** A month with nothing cached behind it still waits, which is the other half of AC3. */
  it('shows a loading state while the first month is still coming', () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-balance')).toBeNull();
  });
});

/**
 * The trend line the navigator draws. What is asserted here is the wiring - that the screen hands it
 * the dashboard's own months - and not the drawing, which `MonthTrend` owns and tests.
 */
describe('the trend behind the navigator', () => {
  it('plots the months around the one on screen and moves to the one touched', async () => {
    stub('GET', '/dashboard/2026/6', 200, dashboardBody({ competenceMonth: '2026-06-01', balance: 100 }));
    stub('GET', '/dashboard/2026/7', 200, dashboardBody({ competenceMonth: '2026-07-01', balance: 200 }));
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);
    stub('GET', '/dashboard/2026/10', 200, dashboardBody({ competenceMonth: '2026-10-01', balance: 300 }));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText('Julho de 2026, R$ 200,00')).toBeTruthy();
    });

    ['Jun', 'Jul', 'Ago', 'Set', 'Out'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Julho de 2026, R$ 200,00'));

    await waitFor(() => {
      expect(screen.getByText('Julho de 2026')).toBeTruthy();
    });
  });

  /** A neighbour that failed is a point the line leaves out, never an error state on the screen. */
  it('still shows the month when a neighbour could not be read', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    await waitFor(() => {
      expect(balanceShows('R$ 5.529,50')).toBeTruthy();
    });

    expect(screen.getByLabelText('Julho de 2026, sem valor')).toBeTruthy();
    expect(screen.queryByText('Tentar novamente')).toBeNull();
    expect(balanceShows('R$ 5.529,50')).toBeTruthy();
  });
});

describe('a negative balance (spec DASH AC5)', () => {
  it('renders the balance with its sign rather than as an absolute value', async () => {
    stub('GET', '/dashboard/2026/9', 200, september);
    stub('GET', '/dashboard/2026/8', 200, august);
    renderScreen();

    await waitFor(() => {
      expect(balanceShows('R$ 5.529,50')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    await waitFor(() => {
      expect(within(screen.getByTestId('dashboard-balance')).getByText('-R$ 470,50')).toBeTruthy();
    });

    // The absolute value is the wrong answer this criterion exists to rule out.
    expect(within(screen.getByTestId('dashboard-balance')).queryByText('R$ 470,50')).toBeNull();
  });
});

describe('a month with nothing in it (spec DASH AC4)', () => {
  it('shows zeroed totals and an empty state rather than a blank screen', async () => {
    stub('GET', '/dashboard/2026/8', 200, emptyMonth);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-balance')).toBeTruthy();
    });

    expect(within(screen.getByTestId('dashboard-total-received')).getByText('R$ 0,00')).toBeTruthy();
    expect(
      within(screen.getByTestId('dashboard-total-committed')).getByText('R$ 0,00')
    ).toBeTruthy();
    expect(within(screen.getByTestId('dashboard-balance')).getByText('R$ 0,00')).toBeTruthy();

    expect(
      screen.getByText(
        'Nenhum registro neste mês. Receitas, despesas e contas recorrentes aparecem aqui assim que forem lançadas.'
      )
    ).toBeTruthy();
  });
});

describe('when the month cannot be read (spec DASH AC7)', () => {
  it('shows the error with a retry that loads the month once it works', async () => {
    stub('GET', '/dashboard/2026/8', 500, {});
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar o mês.')).toBeTruthy();
    });

    stub('GET', '/dashboard/2026/8', 200, august);
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(within(screen.getByTestId('dashboard-balance')).getByText('R$ 5.529,50')).toBeTruthy();
    });
  });

  it("shows the API's own message when it sent one", async () => {
    // MAD-004: the API's pt-BR wording reaches the screen untranslated.
    stub('GET', '/dashboard/2026/8', 400, { errorMessages: ['Mês inválido.'] });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Mês inválido.')).toBeTruthy();
    });

    // Spec UX AC5, the other half: a request the API answered is not a connectivity problem.
    expect(
      screen.queryByText(
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
      )
    ).toBeNull();
  });

  it('says the server could not be reached when the API is unreachable', async () => {
    // Spec UX AC5. `fetch` itself rejecting is `NetworkError`: the request never arrived, so the
    // screen has to say so rather than showing the same sentence a 500 produces.
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        )
      ).toBeTruthy();
    });

    expect(screen.queryByText('Não foi possível carregar o mês.')).toBeNull();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });
});
