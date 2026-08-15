import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useAccounts,
  useCategories,
  useCreateAccount,
  useCreateCategory,
  useCreatePerson,
  usePeople,
} from '@/features/catalogue/api/useCatalogue';
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

/** The API answering one route. Re-stubbing a GET is how "the data changed" is expressed. */
const stub = (method: string, path: string, status: number, body: unknown): void => {
  stubs.set(`${method} ${BASE}${path}`, { status, body });
};

const callsTo = (method: string, path: string): unknown[][] =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      url === `${BASE}${path}` && (init as { method: string }).method === method
  );

const bodySentTo = (method: string, path: string): string | undefined =>
  (callsTo(method, path)[0]?.[1] as { body?: string } | undefined)?.body;

let client = createTestQueryClient();

const renderCatalogueHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

const rayan = { id: 'p1', name: 'Rayan', description: null, isAccountOwner: true };
const marina = { id: 'p2', name: 'Marina', description: 'Esposa', isAccountOwner: false };

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
  // A settled query or mutation holds a garbage-collection timer for its `gcTime`, which outlives
  // the suite and makes Jest report a worker that will not exit.
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

describe('the catalogue lists', () => {
  it("reads the account's people from the person route", async () => {
    stub('GET', '/person', 200, { people: [rayan, marina] });

    const { result } = renderCatalogueHook(() => usePeople());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Spec CAT AC1. Every field is asserted, not only the names: the account owner flag and the
    // description are what the screens read (lesson L-004).
    expect(result.current.data).toEqual([rayan, marina]);
  });

  it("reads the account's categories with their priority integers", async () => {
    stub('GET', '/category', 200, {
      categories: [
        { id: 'c1', name: 'Mercado', description: 'Compras do mês', priority: 0 },
        { id: 'c2', name: 'Streaming', description: null, priority: 2 },
      ],
    });

    const { result } = renderCatalogueHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      { id: 'c1', name: 'Mercado', description: 'Compras do mês', priority: 0 },
      { id: 'c2', name: 'Streaming', description: null, priority: 2 },
    ]);
  });

  it('reads the accounts, carrying a non-card account with all three optional fields null', async () => {
    stub('GET', '/account', 200, {
      accounts: [
        {
          id: 'a1',
          name: 'Nubank Roxinho',
          institution: 'Nu Pagamentos',
          personId: 'p1',
          closingDay: 20,
          dueDay: 27,
          limit: 8000,
        },
        {
          id: 'a2',
          name: 'Inter Débito',
          institution: 'Banco Inter',
          personId: 'p1',
          closingDay: null,
          dueDay: null,
          limit: null,
        },
      ],
    });

    const { result } = renderCatalogueHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Spec CAT AC4: the nullable trio reaches the screen as null, not as 0.
    expect(result.current.data?.[1]).toEqual({
      id: 'a2',
      name: 'Inter Débito',
      institution: 'Banco Inter',
      personId: 'p1',
      closingDay: null,
      dueDay: null,
      limit: null,
    });
    expect(result.current.data?.[0]?.closingDay).toBe(20);
  });
});

describe('creating a catalogue entry', () => {
  it('posts the person exactly as typed', async () => {
    stub('POST', '/person', 201, marina);

    const { result } = renderCatalogueHook(() => useCreatePerson());
    result.current.mutate({ name: 'Marina', description: 'Esposa' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // A literal string, not a rebuilt object: a renamed field would otherwise agree with itself
    // (lesson L-010).
    expect(bodySentTo('POST', '/person')).toBe('{"name":"Marina","description":"Esposa"}');
  });

  it('posts the category with its priority as the integer the API expects', async () => {
    stub('POST', '/category', 201, {
      id: 'c3',
      name: 'Mercado',
      description: 'Compras do mês',
      priority: 0,
    });

    const { result } = renderCatalogueHook(() => useCreateCategory());
    result.current.mutate({ name: 'Mercado', description: 'Compras do mês', priority: 0 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('POST', '/category')).toBe(
      '{"name":"Mercado","description":"Compras do mês","priority":0}'
    );
  });

  it('posts the account with its person and its card fields', async () => {
    stub('POST', '/account', 201, {
      id: 'a1',
      name: 'Nubank Roxinho',
      institution: 'Nu Pagamentos',
      personId: 'p1',
      closingDay: 20,
      dueDay: 27,
      limit: 8000,
    });

    const { result } = renderCatalogueHook(() => useCreateAccount());
    result.current.mutate({
      name: 'Nubank Roxinho',
      institution: 'Nu Pagamentos',
      personId: 'p1',
      closingDay: 20,
      dueDay: 27,
      limit: 8000,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('POST', '/account')).toBe(
      '{"name":"Nubank Roxinho","institution":"Nu Pagamentos","personId":"p1","closingDay":20,"dueDay":27,"limit":8000}'
    );
  });
});

/**
 * Spec CAT AC2 - "show it in the list without a manual refresh".
 *
 * Each of these lets the list settle, then changes what the API would answer, then mutates. Nothing
 * re-reads that route unless the mutation invalidated the list's key, so the second list arriving is
 * the criterion itself rather than a proxy for it. A mutation asserted only to have succeeded would
 * pass with no invalidation at all.
 */
describe('a created entry reaching the list without a manual refresh', () => {
  it('refreshes the people list after a person is created', async () => {
    stub('GET', '/person', 200, { people: [rayan] });

    const { result } = renderCatalogueHook(() => ({
      list: usePeople(),
      create: useCreatePerson(),
    }));

    await waitFor(() => {
      expect(result.current.list.data?.map((person) => person.name)).toEqual(['Rayan']);
    });

    stub('GET', '/person', 200, { people: [rayan, marina] });
    stub('POST', '/person', 201, marina);

    result.current.create.mutate({ name: 'Marina', description: 'Esposa' });

    await waitFor(() => {
      expect(result.current.list.data?.map((person) => person.name)).toEqual(['Rayan', 'Marina']);
    });

    expect(callsTo('GET', '/person')).toHaveLength(2);
  });

  it('refreshes the categories list after a category is created', async () => {
    const mercado = { id: 'c1', name: 'Mercado', description: null, priority: 0 };
    const lazer = { id: 'c2', name: 'Lazer', description: null, priority: 2 };

    stub('GET', '/category', 200, { categories: [mercado] });

    const { result } = renderCatalogueHook(() => ({
      list: useCategories(),
      create: useCreateCategory(),
    }));

    await waitFor(() => {
      expect(result.current.list.data?.map((category) => category.name)).toEqual(['Mercado']);
    });

    stub('GET', '/category', 200, { categories: [mercado, lazer] });
    stub('POST', '/category', 201, lazer);

    result.current.create.mutate({ name: 'Lazer', description: null, priority: 2 });

    await waitFor(() => {
      expect(result.current.list.data?.map((category) => category.name)).toEqual([
        'Mercado',
        'Lazer',
      ]);
    });

    expect(callsTo('GET', '/category')).toHaveLength(2);
  });

  it('refreshes the accounts list after an account is created', async () => {
    const nubank = {
      id: 'a1',
      name: 'Nubank Roxinho',
      institution: 'Nu Pagamentos',
      personId: 'p1',
      closingDay: 20,
      dueDay: 27,
      limit: 8000,
    };
    const inter = {
      id: 'a2',
      name: 'Inter Débito',
      institution: 'Banco Inter',
      personId: 'p1',
      closingDay: null,
      dueDay: null,
      limit: null,
    };

    stub('GET', '/account', 200, { accounts: [nubank] });

    const { result } = renderCatalogueHook(() => ({
      list: useAccounts(),
      create: useCreateAccount(),
    }));

    await waitFor(() => {
      expect(result.current.list.data?.map((account) => account.name)).toEqual(['Nubank Roxinho']);
    });

    stub('GET', '/account', 200, { accounts: [nubank, inter] });
    stub('POST', '/account', 201, inter);

    result.current.create.mutate({
      name: 'Inter Débito',
      institution: 'Banco Inter',
      personId: 'p1',
      closingDay: null,
      dueDay: null,
      limit: null,
    });

    await waitFor(() => {
      expect(result.current.list.data?.map((account) => account.name)).toEqual([
        'Nubank Roxinho',
        'Inter Débito',
      ]);
    });

    expect(callsTo('GET', '/account')).toHaveLength(2);
  });
});
