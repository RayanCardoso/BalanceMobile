import { renderHook, waitFor } from '@testing-library/react-native';

import { authErrorMessages, useSignIn, useSignUp } from '@/features/auth/api/useAuth';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';
import { setToken } from '@/shared/lib/tokenStorage';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const persistedToken = setToken as jest.MockedFunction<typeof setToken>;

const fetchMock = jest.fn();

const lastUrl = (): string => fetchMock.mock.calls[0]?.[0] as string;

const lastBody = (): string | undefined =>
  (fetchMock.mock.calls[0]?.[1] as { body: string | undefined } | undefined)?.body;

const respondWith = (status: number, body: unknown): void => {
  fetchMock.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
};

let client = createTestQueryClient();

const renderAuthHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  persistedToken.mockResolvedValue(undefined);
  useSessionStore.setState({ token: null, name: null, status: 'signedOut' });
  client = createTestQueryClient();
});

afterEach(() => {
  // A settled mutation holds a garbage-collection timer for its `gcTime`, which outlives the suite
  // and makes Jest report a worker that would not exit. `destroy` is what cancels it; `clear` alone
  // drops the entry and leaves the timer running.
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.clear();
});

describe('useSignIn', () => {
  it('posts the typed credentials to the login route', async () => {
    respondWith(200, { name: 'Rayan', token: 'issued-token' });

    const { result } = renderAuthHook(() => useSignIn());
    result.current.mutate({ email: 'rayan@balance.app', password: 'segredo123' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(lastUrl()).toBe('http://10.0.2.2:5126/api/Login');
    expect(lastBody()).toBe('{"email":"rayan@balance.app","password":"segredo123"}');
  });

  it('puts the returned token and name into the session', async () => {
    respondWith(200, { name: 'Rayan', token: 'issued-token' });

    const { result } = renderAuthHook(() => useSignIn());
    result.current.mutate({ email: 'rayan@balance.app', password: 'segredo123' });

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedIn');
    });

    expect(useSessionStore.getState().token).toBe('issued-token');
    expect(useSessionStore.getState().name).toBe('Rayan');
  });

  it("persists the token, so tomorrow's start does not ask for credentials", async () => {
    respondWith(200, { name: 'Rayan', token: 'issued-token' });

    const { result } = renderAuthHook(() => useSignIn());
    result.current.mutate({ email: 'rayan@balance.app', password: 'segredo123' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Spec AUTH AC1: the token goes to the device's storage, which is what AC3 reads back.
    expect(persistedToken).toHaveBeenCalledWith('issued-token');
  });

  it('leaves the session signed out when the credentials are rejected', async () => {
    respondWith(401, { errorMessages: ['E-mail e/ou senha inválidos.'] });

    const { result } = renderAuthHook(() => useSignIn());
    result.current.mutate({ email: 'rayan@balance.app', password: 'errada' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(useSessionStore.getState().token).toBeNull();
    expect(persistedToken).not.toHaveBeenCalled();
  });

  it("surfaces the API's own message when the credentials are rejected", async () => {
    respondWith(401, { errorMessages: ['E-mail e/ou senha inválidos.'] });

    const { result } = renderAuthHook(() => useSignIn());
    result.current.mutate({ email: 'rayan@balance.app', password: 'errada' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Spec AUTH AC7, MAD-004: the wording is the API's, verbatim.
    expect(authErrorMessages(result.current.error)).toEqual(['E-mail e/ou senha inválidos.']);
  });
});

describe('useSignUp', () => {
  it('posts the registration details to the user route', async () => {
    respondWith(201, { name: 'Rayan', token: 'issued-token' });

    const { result } = renderAuthHook(() => useSignUp());
    result.current.mutate({
      name: 'Rayan',
      email: 'rayan@balance.app',
      password: 'segredo123',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(lastUrl()).toBe('http://10.0.2.2:5126/api/User');
    expect(lastBody()).toBe(
      '{"name":"Rayan","email":"rayan@balance.app","password":"segredo123"}'
    );
  });

  it('signs the new account in with the token it was issued', async () => {
    respondWith(201, { name: 'Rayan', token: 'issued-token' });

    const { result } = renderAuthHook(() => useSignUp());
    result.current.mutate({
      name: 'Rayan',
      email: 'rayan@balance.app',
      password: 'segredo123',
    });

    // Spec AUTH AC2: registering lands on the dashboard, which the guard renders once the session
    // is signedIn - so the store, not a navigation call, is what this asserts.
    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedIn');
    });

    expect(useSessionStore.getState().token).toBe('issued-token');
    expect(persistedToken).toHaveBeenCalledWith('issued-token');
  });

  it('leaves the session signed out and reports every message when registration is rejected', async () => {
    respondWith(400, {
      errorMessages: ['E-mail já cadastrado.', 'A senha deve ter no mínimo 6 caracteres.'],
    });

    const { result } = renderAuthHook(() => useSignUp());
    result.current.mutate({ name: 'Rayan', email: 'rayan@balance.app', password: 'x' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(authErrorMessages(result.current.error)).toEqual([
      'E-mail já cadastrado.',
      'A senha deve ter no mínimo 6 caracteres.',
    ]);
  });
});
