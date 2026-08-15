import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PeopleScreen } from '@/features/catalogue/ui/PeopleScreen';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
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
    ([url, init]) =>
      url === `${BASE}${path}` && (init as { method: string }).method === method
  );

  return (call?.[1] as { body?: string } | undefined)?.body;
};

let client = createTestQueryClient();

const renderPeople = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <PeopleScreen />
    </Wrapper>
  );
};

const fillForm = (name: string, description: string): void => {
  fireEvent.changeText(screen.getByLabelText('Nome'), name);
  fireEvent.changeText(screen.getByLabelText('Descrição'), description);
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

describe('the four states of the people list', () => {
  it('shows a loading indicator while the first read is in flight', async () => {
    stub('GET', '/person', 200, {
      people: [{ id: 'p1', name: 'Rayan', description: null, isAccountOwner: true }],
    });
    renderPeople();

    // Spec UX AC1: the first frame is the indicator, not an empty list that would read as "you have
    // no people" while the request is still travelling.
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Rayan')).toBeTruthy();
    });
  });

  it('explains the empty list rather than showing a blank screen', async () => {
    stub('GET', '/person', 200, { people: [] });
    renderPeople();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Nenhuma pessoa cadastrada. As pessoas cadastradas aqui podem ser donas de contas e de despesas.'
        )
      ).toBeTruthy();
    });
  });

  it('says the server could not be reached when the API is unreachable', async () => {
    // Spec UX AC5. A rejected `fetch` is `NetworkError`: the request never arrived, so the screen
    // must not show the same sentence a 500 produces, which is what it did before T45's sweep.
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    renderPeople();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        )
      ).toBeTruthy();
    });

    expect(screen.queryByText('Não foi possível carregar os dados.')).toBeNull();
    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('offers a retry when the read fails, and shows the list once it works', async () => {
    stub('GET', '/person', 500, {});
    renderPeople();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar os dados.')).toBeTruthy();
    });

    stub('GET', '/person', 200, {
      people: [{ id: 'p1', name: 'Rayan', description: null, isAccountOwner: true }],
    });

    // Spec UX AC2: the retry has to actually re-read. A control that renders and does nothing looks
    // identical on screen.
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(screen.getByText('Rayan')).toBeTruthy();
    });
  });

  it('lists each person with the description the API returned', async () => {
    stub('GET', '/person', 200, {
      people: [
        { id: 'p1', name: 'Rayan', description: null, isAccountOwner: true },
        { id: 'p2', name: 'Marina', description: 'Esposa', isAccountOwner: false },
      ],
    });
    renderPeople();

    // Spec CAT AC1. The description is asserted too, not only the names (lesson L-004).
    await waitFor(() => {
      expect(screen.getByText('Rayan')).toBeTruthy();
    });

    expect(screen.getByText('Marina')).toBeTruthy();
    expect(screen.getByText('Esposa')).toBeTruthy();
  });
});

describe('creating a person', () => {
  it('sends the name and description the user typed', async () => {
    stub('GET', '/person', 200, { people: [] });
    stub('POST', '/person', 201, {
      id: 'p2',
      name: 'Marina',
      description: 'Esposa',
      isAccountOwner: false,
    });
    renderPeople();

    fillForm('Marina', 'Esposa');
    fireEvent.press(screen.getByText('Adicionar pessoa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/person')).toBe('{"name":"Marina","description":"Esposa"}');
    });
  });

  it('shows the created person in the list without a manual refresh', async () => {
    stub('GET', '/person', 200, {
      people: [{ id: 'p1', name: 'Rayan', description: null, isAccountOwner: true }],
    });
    stub('POST', '/person', 201, {
      id: 'p2',
      name: 'Marina',
      description: 'Esposa',
      isAccountOwner: false,
    });
    renderPeople();

    await waitFor(() => {
      expect(screen.getByText('Rayan')).toBeTruthy();
    });

    stub('GET', '/person', 200, {
      people: [
        { id: 'p1', name: 'Rayan', description: null, isAccountOwner: true },
        { id: 'p2', name: 'Marina', description: 'Esposa', isAccountOwner: false },
      ],
    });

    fillForm('Marina', 'Esposa');
    fireEvent.press(screen.getByText('Adicionar pessoa'));

    // Spec CAT AC2: nothing here reloads the screen, so Marina only appears if the mutation made
    // the list read the API again.
    await waitFor(() => {
      expect(screen.getByText('Marina')).toBeTruthy();
    });
  });
});

describe('when the API rejects the create', () => {
  const submitAndFail = async (): Promise<void> => {
    stub('GET', '/person', 200, { people: [] });
    stub('POST', '/person', 400, {
      errorMessages: ['O nome é obrigatório.', 'Já existe uma pessoa com esse nome.'],
    });
    renderPeople();

    fillForm('Marina', 'Esposa');
    fireEvent.press(screen.getByText('Adicionar pessoa'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });
  };

  it("shows every message the API sent, word for word", async () => {
    await submitAndFail();

    // Spec CAT AC5 with MAD-004. Both messages, because a screen rendering only the first hides
    // half of what the API said (lesson L-003).
    expect(screen.getByText('O nome é obrigatório.')).toBeTruthy();
    expect(screen.getByText('Já existe uma pessoa com esse nome.')).toBeTruthy();
  });

  it('keeps the form filled', async () => {
    await submitAndFail();

    // Spec CAT AC5, second half. Asserted on the fields' values, not on an error being present: a
    // screen that clears its form on failure satisfies an error-only assertion and still makes the
    // user retype everything.
    expect(screen.getByLabelText('Nome').props.value).toBe('Marina');
    expect(screen.getByLabelText('Descrição').props.value).toBe('Esposa');
  });
});
