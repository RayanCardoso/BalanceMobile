import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RootLayout, SessionGate } from '@/features/auth/ui/RootLayout';
import { useSessionStore } from '@/shared/lib/sessionStore';
import { getToken } from '@/shared/lib/tokenStorage';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * A faithful stand-in for the two pieces of Expo Router the guard actually uses. `Stack.Protected`
 * renders its children only while its `guard` holds - that is what removes a route group from the
 * navigator - and `Stack.Screen` marks which group is mounted. The real ones need a navigation
 * container; the decision under test is which group the session status produces.
 */
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Stack = ({ children }: { children: ReactNode }) =>
    react.createElement(rn.View, null, children);

  Stack.Protected = ({ guard, children }: { guard: boolean; children: ReactNode }) =>
    guard ? children : null;

  Stack.Screen = ({ name }: { name: string }) =>
    react.createElement(rn.Text, { testID: `group-${name}` }, name);

  return { Stack };
});

const storedToken = getToken as jest.MockedFunction<typeof getToken>;

const authGroup = () => screen.queryByTestId('group-(auth)');
const appGroup = () => screen.queryByTestId('group-(app)');

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ token: null, name: null, status: 'loading' });
});

describe('which group the guard renders', () => {
  it('renders neither group while the session is still loading', () => {
    render(<SessionGate status="loading" />);

    // Spec AUTH AC3. This is the frame between mount and secure storage answering. A guard that
    // treats "not signed in yet" as "signed out" flashes sign-in at a signed-in user every start.
    expect(authGroup()).toBeNull();
    expect(appGroup()).toBeNull();
  });

  it('shows a loading indicator instead, so the frame is not blank', () => {
    render(<SessionGate status="loading" />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders the app group and not the auth group when signed in', () => {
    render(<SessionGate status="signedIn" />);

    expect(appGroup()).toBeTruthy();
    expect(authGroup()).toBeNull();
  });

  it('renders the auth group and not the app group when signed out', () => {
    render(<SessionGate status="signedOut" />);

    expect(authGroup()).toBeTruthy();
    expect(appGroup()).toBeNull();
  });
});

describe('what the app does on start', () => {
  it('reads the stored token once', async () => {
    storedToken.mockResolvedValue(null);

    render(<RootLayout />);

    await waitFor(() => {
      expect(storedToken).toHaveBeenCalledTimes(1);
    });
  });

  it('lands on the app group without ever showing sign-in when a token is stored', async () => {
    storedToken.mockResolvedValue('stored-token');

    render(<RootLayout />);

    // Spec AUTH AC3, both halves. Before the read resolves neither group is mounted...
    expect(authGroup()).toBeNull();
    expect(appGroup()).toBeNull();

    await waitFor(() => {
      expect(appGroup()).toBeTruthy();
    });

    // ...and the auth group was never reached on the way there.
    expect(authGroup()).toBeNull();
  });

  it('lands on the auth group when nothing is stored', async () => {
    storedToken.mockResolvedValue(null);

    render(<RootLayout />);

    // Spec AUTH AC4.
    await waitFor(() => {
      expect(authGroup()).toBeTruthy();
    });

    expect(appGroup()).toBeNull();
  });
});
