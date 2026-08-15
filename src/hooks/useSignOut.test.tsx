import { useMutation, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { endSession, installSessionExpiry, useSignOut } from '@/hooks/useSignOut';
import { queryClient as appQueryClient } from '@/navigation/RootLayout';
import { get, post } from '@/services/api';
import { qk } from '@/services/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';
import { clearToken } from '@/utils/tokenStorage';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

// `RootLayout` is imported for the client the app actually runs on, and it reaches Expo Router at
// module load. Nothing here renders the layout itself.
jest.mock('expo-router', () => ({
  Stack: Object.assign(() => null, { Protected: () => null, Screen: () => null }),
}));

const storageCleared = clearToken as jest.MockedFunction<typeof clearToken>;

const fetchMock = jest.fn();

const respondWith = (status: number, body: unknown): void => {
  fetchMock.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
};

let client = createTestQueryClient();

const wrapper = ({ children }: { children: ReactNode }): React.JSX.Element =>
  createQueryWrapper(client)({ children });

/**
 * `gcTime: 0` on every hook below. Ending a session empties the cache from inside the error
 * handler, which drops each entry before its garbage-collection timer is cancelled - the timer then
 * outlives the suite and Jest reports a worker that will not exit. Nothing here depends on cached
 * data surviving its observer.
 */
const noGarbageTimer = { gcTime: 0 } as const;

/** What the first account left in the cache before it signed out. */
const seedTheCache = (): void => {
  client.setQueryData(qk.people(), [{ id: 'person-1', name: 'Rayan' }]);
  client.setQueryData(qk.dashboard(2026, 8), { totalIncome: 5000 });
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  storageCleared.mockResolvedValue(undefined);
  useSessionStore.setState({ token: 'stored-token', name: 'Rayan', status: 'signedIn' });
  client = createTestQueryClient();
  installSessionExpiry(client);
});

afterEach(() => {
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.clear();
});

describe('signing out', () => {
  it('clears the stored token and returns the session to signed out', async () => {
    await endSession(client);

    // Spec AUTH AC6, first half - and what makes the next start land on sign-in (AC4).
    expect(storageCleared).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(useSessionStore.getState().token).toBeNull();
  });

  it("empties the query cache, so a second account cannot read the first's data", async () => {
    seedTheCache();
    expect(client.getQueryData(qk.people())).toEqual([{ id: 'person-1', name: 'Rayan' }]);

    await endSession(client);

    // Spec AUTH AC6, second half. Read back out of the cache rather than asserting that `clear`
    // was called: a mocked-away `clear` proves the line ran, not that the data is gone.
    expect(client.getQueryData(qk.people())).toBeUndefined();
    expect(client.getQueryData(qk.dashboard(2026, 8))).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('is what the hook hands the screen', async () => {
    seedTheCache();

    const { result } = renderHook(() => useSignOut(), { wrapper });
    await result.current();

    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('when an authorised request is answered with 401', () => {
  it('ends the session, so the guard returns to sign-in', async () => {
    seedTheCache();
    respondWith(401, {});

    renderHook(
      () =>
        useQuery({ queryKey: qk.categories(), queryFn: () => get('/category'), ...noGarbageTimer }),
      { wrapper }
    );

    // Spec AUTH AC5. The token is 60 minutes old and there is no refresh endpoint, so this is how
    // an expired session surfaces.
    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedOut');
    });

    expect(storageCleared).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(qk.people())).toBeUndefined();
  });

  it('ends the session when the 401 came from a mutation rather than a query', async () => {
    respondWith(401, {});

    const { result } = renderHook(
      () => useMutation({ mutationFn: () => post('/person', { name: 'Rayan' }), ...noGarbageTimer }),
      { wrapper }
    );
    result.current.mutate();

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedOut');
    });
  });

  it('leaves a rejected sign-in alone, because that request was not an authorised one', async () => {
    // The API answers a wrong password with 401 too. Treating it as an expired session would wipe
    // the cache on every typo and put the sign-in screen's own message (AUTH AC7) in question.
    useSessionStore.setState({ token: null, name: null, status: 'signedOut' });
    respondWith(401, { errorMessages: ['E-mail e/ou senha inválidos.'] });

    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => post('/login', { email: 'a@b.c', password: 'x' }),
          ...noGarbageTimer,
        }),
      { wrapper }
    );
    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(storageCleared).not.toHaveBeenCalled();
  });
});

describe('the client the app actually runs on', () => {
  it('reacts to a 401 without any screen wiring it up', async () => {
    respondWith(401, {});

    const { result } = renderHook(
      () => useMutation({ mutationFn: () => post('/person', { name: 'Rayan' }), ...noGarbageTimer }),
      { wrapper: createQueryWrapper(appQueryClient) }
    );
    result.current.mutate();

    // The handler is installed on the root layout's own client, not only on the one this suite
    // builds. A reaction that exists only in the test's setup protects nothing.
    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedOut');
    });

    appQueryClient.getMutationCache().getAll().forEach((mutation) => {
      mutation.destroy();
    });
    appQueryClient.clear();
  });
});
