import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { CategoriesScreen } from '@/features/catalogue/ui/CategoriesScreen';
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
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

  return (call?.[1] as { body?: string } | undefined)?.body;
};

let client = createTestQueryClient();

const renderCategories = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <CategoriesScreen />
    </Wrapper>
  );
};

const category = (id: string, name: string, priority: 0 | 1 | 2) => ({
  id,
  name,
  description: null,
  priority,
});

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

describe('the four states of the category list', () => {
  it('shows a loading indicator while the first read is in flight', async () => {
    stub('GET', '/category', 200, { categories: [category('c1', 'Mercado', 0)] });
    renderCategories();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Mercado')).toBeTruthy();
    });
  });

  it('explains the empty list rather than showing a blank screen', async () => {
    stub('GET', '/category', 200, { categories: [] });
    renderCategories();

    await waitFor(() => {
      expect(
        screen.getByText('Nenhuma categoria cadastrada. Categorias organizam suas despesas.')
      ).toBeTruthy();
    });
  });

  it('offers a retry when the read fails, and shows the list once it works', async () => {
    stub('GET', '/category', 500, {});
    renderCategories();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar os dados.')).toBeTruthy();
    });

    stub('GET', '/category', 200, { categories: [category('c1', 'Mercado', 0)] });
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(screen.getByText('Mercado')).toBeTruthy();
    });
  });
});

describe('priority labels', () => {
  // Spec CAT AC3. One fixture per value with a literal expected string (lesson L-010): a map that
  // returned the same label for every priority would still pass a single-value test.
  //
  // Assertions are scoped to the list, not the whole screen: the create form's own Picker always
  // renders all three priority labels as option buttons, so an unscoped query for "Essencial" would
  // match both the picker option and the list row whenever a row happens to be Essencial too.
  it.each([
    [0 as const, 'Essencial'],
    [1 as const, 'Importante'],
    [2 as const, 'Supérfluo'],
  ])('renders priority %i as %s', async (priority, label) => {
    stub('GET', '/category', 200, { categories: [category('c1', 'Alguma coisa', priority)] });
    renderCategories();

    await waitFor(() => {
      expect(within(screen.getByTestId('category-list')).getByText(label)).toBeTruthy();
    });
  });
});

describe('two categories with the same name', () => {
  // Spec edge case: the API accepts duplicate names, and a screen that de-duplicated by name would
  // silently hide one of them.
  it('lists both as separate rows', async () => {
    stub('GET', '/category', 200, {
      categories: [category('c1', 'Mercado', 0), category('c2', 'Mercado', 2)],
    });
    renderCategories();

    await waitFor(() => {
      expect(screen.getAllByText('Mercado')).toHaveLength(2);
    });

    const list = within(screen.getByTestId('category-list'));

    expect(list.getByText('Essencial')).toBeTruthy();
    expect(list.getByText('Supérfluo')).toBeTruthy();
  });
});

describe('creating a category', () => {
  it('sends the name, description and chosen priority', async () => {
    stub('GET', '/category', 200, { categories: [] });
    stub('POST', '/category', 201, category('c1', 'Lazer', 2));
    renderCategories();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Lazer');
    fireEvent.press(screen.getByText('Supérfluo'));
    fireEvent.press(screen.getByText('Adicionar categoria'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/category')).toBe(
        '{"name":"Lazer","description":null,"priority":2}'
      );
    });
  });

  it('shows the created category in the list without a manual refresh', async () => {
    stub('GET', '/category', 200, { categories: [] });
    stub('POST', '/category', 201, category('c1', 'Lazer', 2));
    renderCategories();

    await waitFor(() => {
      expect(
        screen.getByText('Nenhuma categoria cadastrada. Categorias organizam suas despesas.')
      ).toBeTruthy();
    });

    stub('GET', '/category', 200, { categories: [category('c1', 'Lazer', 2)] });

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Lazer');
    fireEvent.press(screen.getByText('Adicionar categoria'));

    await waitFor(() => {
      expect(screen.getByText('Lazer')).toBeTruthy();
    });
  });
});

describe('when the API rejects the create', () => {
  const submitAndFail = async (): Promise<void> => {
    stub('GET', '/category', 200, { categories: [] });
    stub('POST', '/category', 400, {
      errorMessages: ['O nome é obrigatório.'],
    });
    renderCategories();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Lazer');
    fireEvent.press(screen.getByText('Adicionar categoria'));

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

    expect(screen.getByLabelText('Nome').props.value).toBe('Lazer');
  });
});
