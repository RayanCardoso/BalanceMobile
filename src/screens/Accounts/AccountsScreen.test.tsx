import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { AccountsScreen } from '@/screens/Accounts/AccountsScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
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

const person = (id: string, name: string) => ({
  id,
  name,
  description: null,
  isAccountOwner: false,
});

const account = (
  id: string,
  name: string,
  institution: string,
  personId: string,
  closingDay: number | null,
  dueDay: number | null,
  limit: number | null
) => ({ id, name, institution, personId, closingDay, dueDay, limit });

let client = createTestQueryClient();

const renderAccounts = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <AccountsScreen />
    </Wrapper>
  );
};

const fillRequiredFields = (name: string, institution: string): void => {
  fireEvent.changeText(screen.getByLabelText('Nome'), name);
  fireEvent.changeText(screen.getByLabelText('Instituição'), institution);
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

describe('the four states of the account list', () => {
  it('shows a loading indicator while the first read is in flight', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, {
      accounts: [account('a1', 'Inter Débito', 'Banco Inter', 'p1', null, null, null)],
    });
    renderAccounts();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Inter Débito')).toBeTruthy();
    });
  });

  it('explains the empty list rather than showing a blank screen', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, { accounts: [] });
    renderAccounts();

    await waitFor(() => {
      expect(
        screen.getByText('Nenhuma conta cadastrada. Contas são de onde suas despesas saem.')
      ).toBeTruthy();
    });
  });

  it('offers a retry when the read fails, and shows the list once it works', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 500, {});
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar os dados.')).toBeTruthy();
    });

    stub('GET', '/account', 200, {
      accounts: [account('a1', 'Inter Débito', 'Banco Inter', 'p1', null, null, null)],
    });
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(screen.getByText('Inter Débito')).toBeTruthy();
    });
  });
});

describe('an account with no closing day, due day or limit', () => {
  // Spec CAT AC4. "Inter Débito" describes exactly this account: none of the three card fields apply.
  it('renders cleanly, with no NaN, undefined or null leaking onto the screen', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, {
      accounts: [account('a1', 'Inter Débito', 'Banco Inter', 'p1', null, null, null)],
    });
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByText('Inter Débito')).toBeTruthy();
    });

    const row = within(screen.getByTestId('account-list'));

    expect(row.getByText('Banco Inter')).toBeTruthy();
    expect(row.queryByText(/NaN/)).toBeNull();
    expect(row.queryByText(/undefined/)).toBeNull();
    expect(row.queryByText(/null/)).toBeNull();
  });

  it('sends null, not 0 or an empty string, for each field left empty', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, { accounts: [] });
    stub('POST', '/account', 201, account('a1', 'Inter Débito', 'Banco Inter', 'p1', null, null, null));
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillRequiredFields('Inter Débito', 'Banco Inter');
    fireEvent.press(screen.getByText('Adicionar conta'));

    await waitFor(() => {
      const sent = bodySentTo('POST', '/account');
      expect(sent).toBeDefined();
      const payload = JSON.parse(sent!) as Record<string, unknown>;

      expect(payload.closingDay).toBeNull();
      expect(payload.dueDay).toBeNull();
      expect(payload.limit).toBeNull();
    });
  });

  it('renders the card fields when they are set', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, {
      accounts: [account('a1', 'Nubank Roxinho', 'Nu Pagamentos', 'p1', 20, 27, 8000)],
    });
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByText(/fecha dia 20/)).toBeTruthy();
    });

    expect(screen.getByText(/vence dia 27/)).toBeTruthy();
    expect(screen.getByText(/R\$ 8\.000,00/)).toBeTruthy();
  });
});

describe('person preselection (spec CAT AC6)', () => {
  it('preselects the only person and sends their id without showing a picker', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, { accounts: [] });
    stub('POST', '/account', 201, account('a1', 'Inter Débito', 'Banco Inter', 'p1', null, null, null));
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    expect(screen.queryByText('Rayan')).toBeNull();

    fillRequiredFields('Inter Débito', 'Banco Inter');
    fireEvent.press(screen.getByText('Adicionar conta'));

    await waitFor(() => {
      const sent = bodySentTo('POST', '/account');
      expect(sent).toBeDefined();
      expect((JSON.parse(sent!) as Record<string, unknown>).personId).toBe('p1');
    });
  });

  it('preselects nobody with two people, and sends whichever is chosen', async () => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan'), person('p2', 'Marina')] });
    stub('GET', '/account', 200, { accounts: [] });
    stub(
      'POST',
      '/account',
      201,
      account('a1', 'Itaú Click', 'Itaú Unibanco', 'p2', null, null, null)
    );
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByText('Marina')).toBeTruthy();
    });

    fillRequiredFields('Itaú Click', 'Itaú Unibanco');
    fireEvent.press(screen.getByText('Marina'));
    fireEvent.press(screen.getByText('Adicionar conta'));

    await waitFor(() => {
      const sent = bodySentTo('POST', '/account');
      expect(sent).toBeDefined();
      expect((JSON.parse(sent!) as Record<string, unknown>).personId).toBe('p2');
    });
  });
});

describe('when the API rejects the create', () => {
  const submitAndFail = async (): Promise<void> => {
    stub('GET', '/person', 200, { people: [person('p1', 'Rayan')] });
    stub('GET', '/account', 200, { accounts: [] });
    stub('POST', '/account', 400, { errorMessages: ['O nome é obrigatório.'] });
    renderAccounts();

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeTruthy();
    });

    fillRequiredFields('Inter Débito', 'Banco Inter');
    fireEvent.press(screen.getByText('Adicionar conta'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });
  };

  it("shows the message the API sent", async () => {
    await submitAndFail();

    expect(screen.getByText('O nome é obrigatório.')).toBeTruthy();
  });

  it('keeps the form filled', async () => {
    await submitAndFail();

    expect(screen.getByLabelText('Nome').props.value).toBe('Inter Débito');
    expect(screen.getByLabelText('Instituição').props.value).toBe('Banco Inter');
  });
});
