import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import DashboardRoute from '../../../../app/(app)/index';

import { DashboardScreen } from '@/features/dashboard/ui/DashboardScreen';
import { AppShell } from '@/features/navigation/ui/AppShell';
import { qk } from '@/shared/api/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';
import { clearToken } from '@/shared/lib/tokenStorage';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * `Stack` renders its children and `Link` becomes a `Text` carrying its `href` as `testID` - the
 * same stand-in style `RootLayout.test.tsx` and `CatalogueMenu.test.tsx` use. Enough to prove which
 * route each destination targets, without a navigation container.
 */
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Stack = ({ children }: { children?: ReactNode }) =>
    react.createElement(rn.View, { testID: 'app-stack' }, children);

  const Link = ({ href, children }: { href: string; children: ReactNode }) =>
    react.createElement(rn.Text, { testID: `link-${href}` }, children);

  return { Stack, Link };
});

const storageCleared = clearToken as jest.MockedFunction<typeof clearToken>;

let client = createTestQueryClient();

const renderShell = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <AppShell />
    </Wrapper>
  );
};

/** What the signed-in account left in the cache before pressing Sair. */
const seedTheCache = (): void => {
  client.setQueryData(qk.people(), [{ id: 'person-1', name: 'Rayan' }]);
  client.setQueryData(qk.dashboard(2026, 8), { balance: 5529.5 });
};

beforeEach(() => {
  jest.clearAllMocks();
  storageCleared.mockResolvedValue(undefined);
  useSessionStore.setState({ token: 'issued-token', name: 'Rayan', status: 'signedIn' });
  client = createTestQueryClient();
});

afterEach(() => {
  client.clear();
});

describe('the destinations the shell reaches (spec DASH AC1)', () => {
  it('reaches the dashboard, income, expenses, recurring bills and the catalogue', () => {
    renderShell();

    expect(screen.getByTestId('link-/')).toBeTruthy();
    expect(screen.getByTestId('link-/income')).toBeTruthy();
    expect(screen.getByTestId('link-/expenses')).toBeTruthy();
    expect(screen.getByTestId('link-/recurring')).toBeTruthy();
    expect(screen.getByTestId('link-/catalogue')).toBeTruthy();
  });

  it('labels each destination in Portuguese', () => {
    renderShell();

    expect(screen.getByText('Resumo')).toBeTruthy();
    expect(screen.getByText('Receitas')).toBeTruthy();
    expect(screen.getByText('Despesas')).toBeTruthy();
    expect(screen.getByText('Recorrentes')).toBeTruthy();
    expect(screen.getByText('Catálogo')).toBeTruthy();
  });

  /**
   * The dashboard is the group's index route, so `/` resolves to it and it is what a signed-in user
   * lands on when the root guard mounts `(app)`. Asserting the route module's own export is the
   * proof available without a navigation container: a `/` link pointing at a group whose index
   * mounted some other screen would still satisfy the link assertions above.
   */
  it('mounts the dashboard as the index route of the signed-in group', () => {
    expect(DashboardRoute).toBe(DashboardScreen);
  });
});

describe('signing out from the shell (spec AUTH AC6)', () => {
  it('clears the stored token and returns the session to signed out', async () => {
    renderShell();

    fireEvent.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedOut');
    });

    expect(useSessionStore.getState().token).toBeNull();
    expect(storageCleared).toHaveBeenCalledTimes(1);
  });

  it("empties the query cache, so a second account cannot read the first's data", async () => {
    seedTheCache();
    renderShell();

    expect(client.getQueryData(qk.people())).toEqual([{ id: 'person-1', name: 'Rayan' }]);

    fireEvent.press(screen.getByText('Sair'));

    // Read back out of the cache rather than asserting `clear` was called: a spied-on `clear`
    // proves the line ran, not that the previous account's data is gone.
    await waitFor(() => {
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });

    expect(client.getQueryData(qk.people())).toBeUndefined();
    expect(client.getQueryData(qk.dashboard(2026, 8))).toBeUndefined();
  });
});
