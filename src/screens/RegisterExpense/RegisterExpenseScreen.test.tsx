import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ExpenseMonthScreen } from '@/screens/Expense/ExpenseMonthScreen';
import { RegisterExpenseScreen } from '@/screens/RegisterExpense/RegisterExpenseScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

let mockParams: { year?: string; month?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

/**
 * The month on screen is August and the purchase is dated **21 August**. The account closes on the
 * 20th, so the API answers with September: the case spec EXP AC6 exists for, and the case where a
 * client computing its own competence month would get it wrong.
 */
jest.mock('@/utils/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/dates'),
  currentMonth: () => ({ year: 2026, month: 8 }),
  todayApiDate: () => '2026-08-21',
}));

const BASE = 'http://10.0.2.2:5126/api';

const fetchMock = jest.fn();

const stubs = new Map<string, { status: number; body: unknown }>();

const stub = (method: string, path: string, status: number, body: unknown): void => {
  stubs.set(`${method} ${BASE}${path}`, { status, body });
};

const bodySentTo = (method: string, path: string): string | undefined => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

  return (call?.[1] as { body?: string } | undefined)?.body;
};

const expensePayload = (): Record<string, unknown> =>
  JSON.parse(bodySentTo('POST', '/expense')!) as Record<string, unknown>;

const rayan = { id: 'p1', name: 'Rayan', description: null, isAccountOwner: true };
const marina = { id: 'p2', name: 'Marina', description: null, isAccountOwner: false };

const food = { id: 'c1', name: 'Alimentação', description: null, priority: 0 };

const rayansCard = {
  id: 'a1',
  name: 'Nubank',
  institution: 'Nubank',
  personId: 'p1',
  closingDay: 20,
  dueDay: 27,
  limit: 5000,
};

/** Spec EXP AC7: an account of another person of the same household is a valid choice. */
const marinasCard = {
  id: 'a2',
  name: 'Cartão da Marina',
  institution: 'Itaú',
  personId: 'p2',
  closingDay: 15,
  dueDay: 22,
  limit: 3000,
};

const registeredIn = (competenceMonth: string) => ({
  id: 'e2',
  name: 'Passagem',
  personId: 'p1',
  type: 0,
  amount: 480,
  categoryId: 'c1',
  accountId: 'a1',
  date: '2026-08-21',
  competenceMonth,
  installmentNumber: null,
  installmentPlanId: null,
});

const monthBody = (variableLines: unknown[]) => ({
  competenceMonth: '2026-08-01',
  variableLines,
  recurringLines: [],
  totalVariable: 0,
  totalRecurringExpected: 0,
  totalRecurringPaid: 0,
  totalCommitted: 0,
});

const augustLine = {
  expenseId: 'e2',
  name: 'Passagem',
  type: 0,
  amount: 480,
  date: '2026-08-21',
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

let client = createTestQueryClient();

const catalogue = (people: unknown[], accounts: unknown[]): void => {
  stub('GET', '/person', 200, { people });
  stub('GET', '/category', 200, { categories: [food] });
  stub('GET', '/account', 200, { accounts });
};

const renderForm = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RegisterExpenseScreen />
    </Wrapper>
  );
};

/**
 * The pickers list catalogue data, so the form is only usable once it has arrived. Waiting on the
 * options rather than on a field is what keeps a press from being issued against a form whose ids
 * are still null - the submit guard would skip silently and the test would assert on nothing.
 */
const fillCatalogueChoices = async (accountName = 'Nubank'): Promise<void> => {
  await waitFor(() => {
    expect(within(screen.getByTestId('category-picker')).getByText('Alimentação')).toBeTruthy();
    expect(within(screen.getByTestId('account-picker')).getByText(accountName)).toBeTruthy();
  });

  fireEvent.press(within(screen.getByTestId('category-picker')).getByText('Alimentação'));
  fireEvent.press(within(screen.getByTestId('account-picker')).getByText(accountName));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { year: '2026', month: '8' };
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
  catalogue([rayan], [rayansCard]);
});

afterEach(() => {
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

/**
 * Spec EXP AC2 and AC3 - the seven fields the criterion names go out, and the competence month is
 * left to the API rather than computed here (MAD-001).
 */
describe('the payload without an override (spec EXP AC2, AC3)', () => {
  it('sends the date and a null competence month', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-09-01'));
    renderForm();

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/expense')).toBe(
      '{"name":"Passagem","personId":"p1","type":0,"amount":480,"categoryId":"c1","accountId":"a1","date":"2026-08-21","competenceMonth":null}'
    );

    // Null, not the month of the date and not the month on screen: both would be August here, and
    // the API's answer is September.
    expect(expensePayload().competenceMonth).toBeNull();
    expect(expensePayload().date).toBe('2026-08-21');
  });

  it('sends the type the user chose rather than the default', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-08-01'));
    renderForm();

    await fillCatalogueChoices();

    fireEvent.press(within(screen.getByTestId('type-picker')).getByText('Pix'));
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    // The integer the API's enum expects, not the label and not a stringified value.
    expect(expensePayload().type).toBe(2);
  });
});

/** Spec EXP AC4 - "WHERE a user chooses to override the competence month, send the chosen month". */
describe('the payload with an override (spec EXP AC4)', () => {
  it('sends the chosen month and leaves the purchase date alone', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-09-01'));
    renderForm();

    await fillCatalogueChoices();

    fireEvent.press(screen.getByText('Definir o mês de competência'));

    await waitFor(() => {
      expect(screen.getByLabelText('Mês de competência, Agosto de 2026')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByText('Set'));

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    expect(expensePayload().competenceMonth).toBe('2026-09-01');
    expect(expensePayload().date).toBe('2026-08-21');
  });
});

/**
 * Spec EXP AC6 - "WHEN a registered expense's competence month differs from the month being viewed
 * THEN the system SHALL tell the user which month it landed in".
 *
 * Both halves are asserted. The notice names the month the **API** returned, and there is no notice
 * at all when the two months agree: a message that always appears tells the user nothing about the
 * one case it exists for.
 */
describe('where the expense landed (spec EXP AC6)', () => {
  it('names the month the API returned when it is not the month on screen', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-09-01'));
    renderForm();

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(screen.getByTestId('competence-notice')).toBeTruthy();
    });

    expect(
      within(screen.getByTestId('competence-notice')).getByText('Lançado em Setembro de 2026.')
    ).toBeTruthy();
  });

  it('says nothing extra when the expense landed in the month on screen', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-08-01'));
    renderForm();

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    // The name is cleared on success, which is what marks the round trip as finished here.
    await waitFor(() => {
      expect(screen.getByLabelText('Nome').props.value).toBe('');
    });

    expect(screen.queryByTestId('competence-notice')).toBeNull();
  });
});

/**
 * Spec EXP AC5 - "refresh the affected month so the new line appears without a manual reload".
 *
 * The month screen is rendered beside the form and nothing in the test reloads it.
 */
describe('the month after a registration (spec EXP AC5)', () => {
  it('shows the new expense without a manual reload', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([]));
    stub('POST', '/expense', 201, registeredIn('2026-08-01'));

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <ExpenseMonthScreen />
        <RegisterExpenseScreen />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma despesa neste mês. Registre uma compra ou cadastre uma conta recorrente para acompanhá-la aqui.')).toBeTruthy();
    });

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');

    stub('GET', '/expense/2026/8', 200, monthBody([augustLine]));
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(within(screen.getByTestId('variable-line-list')).getByText('Passagem')).toBeTruthy();
    });
  });
});

/**
 * Spec EXP AC7 - "allow an expense to reference an account belonging to a different person of the
 * same account holder". Deliberate backend behaviour, so there is no client-side filter to add.
 */
describe('an account of another person (spec EXP AC7)', () => {
  it("offers every household account and sends the one chosen, whoever owns it", async () => {
    catalogue([rayan, marina], [rayansCard, marinasCard]);
    stub('POST', '/expense', 201, { ...registeredIn('2026-08-01'), accountId: 'a2' });
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('person-picker')).getByText('Rayan')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('person-picker')).getByText('Rayan'));

    // Both accounts are offered while Rayan is the chosen person: the picker is not filtered.
    await fillCatalogueChoices('Cartão da Marina');
    expect(within(screen.getByTestId('account-picker')).getByText('Nubank')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    expect(expensePayload().personId).toBe('p1');
    expect(expensePayload().accountId).toBe('a2');
  });
});

/** Spec CAT AC6 - one person is preselected and no picker is shown. */
describe('a household with one person', () => {
  it('preselects that person and sends their id', async () => {
    stub('POST', '/expense', 201, registeredIn('2026-08-01'));
    renderForm();

    await fillCatalogueChoices();

    expect(screen.queryByTestId('person-picker')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    expect(expensePayload().personId).toBe('p1');
  });
});

/**
 * Spec EXP AC8 - "show the API's messages and keep the form filled". Two criteria, two assertions
 * (lesson L-003): a form that cleared itself on failure would satisfy the message half and still
 * make the user retype everything.
 */
describe('when the API rejects the expense', () => {
  it('shows every message word for word and keeps what was typed', async () => {
    stub('POST', '/expense', 400, {
      errorMessages: [
        'O valor deve ser maior que zero.',
        'A conta informada não pertence ao usuário.',
      ],
    });
    renderForm();

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('O valor deve ser maior que zero.')).toBeTruthy();
    expect(screen.getByText('A conta informada não pertence ao usuário.')).toBeTruthy();

    expect(screen.getByLabelText('Nome').props.value).toBe('Passagem');
    expect(screen.getByLabelText('Valor').props.value).toBe('480,00');
  });

  /**
   * Spec UX AC5 and the offline edge case - "report the failure rather than appearing to succeed".
   *
   * A submitted form is where an unreachable API hurt most: `NetworkError` carries no
   * `errorMessages`, so before T45's sweep the press produced **no message at all** and the form sat
   * there looking as if nothing had been pressed.
   */
  it('says the server could not be reached when the API is unreachable', async () => {
    renderForm();

    await fillCatalogueChoices();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');

    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        )
      ).toBeTruthy();
    });

    // What the user typed survives, exactly as it does when the API rejects the request.
    expect(screen.getByLabelText('Nome').props.value).toBe('Passagem');
    expect(screen.getByLabelText('Valor').props.value).toBe('480,00');
  });
});
