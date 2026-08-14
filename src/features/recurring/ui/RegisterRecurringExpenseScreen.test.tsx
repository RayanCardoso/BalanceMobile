import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RegisterRecurringExpenseScreen } from '@/features/recurring/ui/RegisterRecurringExpenseScreen';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const BASE = 'http://localhost:5126/api';

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

let client = createTestQueryClient();

const renderRegister = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RegisterRecurringExpenseScreen />
    </Wrapper>
  );
};

const stubCatalogue = (): void => {
  stub('GET', '/person', 200, {
    people: [{ id: 'p1', name: 'Rayan', description: null, isAccountOwner: true }],
  });
  stub('GET', '/category', 200, {
    categories: [{ id: 'c1', name: 'Moradia', description: null, priority: 0 }],
  });
  stub('GET', '/account', 200, {
    accounts: [{ id: 'a1', name: 'Inter Débito', institution: 'Banco Inter', personId: 'p1', closingDay: null, dueDay: null, limit: null }],
  });
};

const fillForm = (name: string, dueDay: string, amount: string): void => {
  fireEvent.changeText(screen.getByLabelText('Nome'), name);
  fireEvent.press(screen.getByText('Moradia'));
  fireEvent.press(screen.getByText('Inter Débito'));
  fireEvent.changeText(screen.getByLabelText('Dia de vencimento'), dueDay);
  fireEvent.changeText(screen.getByLabelText('Valor base'), amount);
};

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
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

describe('registering a recurring bill (spec REC AC1)', () => {
  it('sends the estimate flag true when "Estimativa" is chosen', async () => {
    stubCatalogue();
    stub('POST', '/recurring-expense', 201, {
      id: 'r1',
      name: 'Luz',
      personId: 'p1',
      categoryId: 'c1',
      accountId: 'a1',
      dueDay: 15,
      isEstimate: true,
      archived: false,
      versions: [],
    });
    renderRegister();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillForm('Luz', '15', '220,00');
    // "Estimativa" is the default selection; submitting without touching the picker still sends true.
    fireEvent.press(screen.getByText('Cadastrar conta'));

    await waitFor(() => {
      const sent = bodySentTo('POST', '/recurring-expense');
      expect(sent).toBeDefined();
      expect((JSON.parse(sent!) as Record<string, unknown>).isEstimate).toBe(true);
    });
  });

  it('sends the estimate flag false when "Valor fixo" is chosen', async () => {
    stubCatalogue();
    stub('POST', '/recurring-expense', 201, {
      id: 'r1',
      name: 'Netflix',
      personId: 'p1',
      categoryId: 'c1',
      accountId: 'a1',
      dueDay: 22,
      isEstimate: false,
      archived: false,
      versions: [],
    });
    renderRegister();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillForm('Netflix', '22', '44,90');
    fireEvent.press(screen.getByText('Valor fixo'));
    fireEvent.press(screen.getByText('Cadastrar conta'));

    await waitFor(() => {
      const sent = bodySentTo('POST', '/recurring-expense');
      expect(sent).toBeDefined();
      expect((JSON.parse(sent!) as Record<string, unknown>).isEstimate).toBe(false);
    });
  });

  it('sends the name, person, category, account, due day and amount', async () => {
    stubCatalogue();
    stub('POST', '/recurring-expense', 201, {
      id: 'r1',
      name: 'Aluguel',
      personId: 'p1',
      categoryId: 'c1',
      accountId: 'a1',
      dueDay: 10,
      isEstimate: false,
      archived: false,
      versions: [],
    });
    renderRegister();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillForm('Aluguel', '10', '2250,00');
    fireEvent.press(screen.getByText('Valor fixo'));
    fireEvent.press(screen.getByText('Cadastrar conta'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/recurring-expense')).toBe(
        '{"name":"Aluguel","personId":"p1","categoryId":"c1","accountId":"a1","dueDay":10,"amount":2250,"isEstimate":false}'
      );
    });
  });
});

describe('when the API rejects the due day', () => {
  it('shows the message the API sent', async () => {
    stubCatalogue();
    stub('POST', '/recurring-expense', 400, { errorMessages: ['O dia deve estar entre 1 e 31.'] });
    renderRegister();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillForm('Aluguel', '40', '2250,00');
    fireEvent.press(screen.getByText('Cadastrar conta'));

    await waitFor(() => {
      expect(screen.getByText('O dia deve estar entre 1 e 31.')).toBeTruthy();
    });
  });
});
