import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SignInScreen } from '@/features/auth/ui/SignInScreen';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

// The screen renders outside a navigator here, so `Link` stands in as the `Text` the real one
// renders. Where it points is Expo Router's concern, not this screen's.
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  return {
    Link: ({ children }: { children: ReactNode }) => react.createElement(rn.Text, null, children),
  };
});

const fetchMock = jest.fn();

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

const renderSignIn = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <SignInScreen />
    </Wrapper>
  );
};

const typeCredentials = (email: string, password: string): void => {
  fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  fireEvent.changeText(screen.getByLabelText('Senha'), password);
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useSessionStore.setState({ token: null, name: null, status: 'signedOut' });
  client = createTestQueryClient();
});

afterEach(() => {
  client.getMutationCache().getAll().forEach((mutation) => {
    mutation.destroy();
  });
  client.clear();
});

describe('signing in', () => {
  it('sends the credentials the user typed', async () => {
    respondWith(200, { name: 'Rayan', token: 'issued-token' });
    renderSignIn();

    typeCredentials('rayan@balance.app', 'segredo123');
    fireEvent.press(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(lastBody()).toBe('{"email":"rayan@balance.app","password":"segredo123"}');
  });

  it('signs the session in with the returned token', async () => {
    respondWith(200, { name: 'Rayan', token: 'issued-token' });
    renderSignIn();

    typeCredentials('rayan@balance.app', 'segredo123');
    fireEvent.press(screen.getByText('Entrar'));

    // Spec AUTH AC1: the dashboard follows from the session, which the route guard reads. The
    // screen itself never navigates.
    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedIn');
    });

    expect(useSessionStore.getState().token).toBe('issued-token');
  });
});

describe('when the API rejects the credentials', () => {
  const submitAndFail = async (): Promise<void> => {
    respondWith(401, { errorMessages: ['E-mail e/ou senha inválidos.'] });
    renderSignIn();

    typeCredentials('rayan@balance.app', 'errada');
    fireEvent.press(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toBeTruthy();
    });
  };

  it("shows the API's own message, word for word", async () => {
    await submitAndFail();

    // Spec AUTH AC7 with MAD-004: the app renders what the API said, not a phrasing of its own.
    expect(screen.getByText('E-mail e/ou senha inválidos.')).toBeTruthy();
  });

  it('leaves the entered email in the field', async () => {
    await submitAndFail();

    // Spec AUTH AC7, second half. Asserted on the field's value, not on the error being present:
    // a screen that resets its form on failure satisfies an error-only assertion and still makes
    // the user retype their address.
    expect(screen.getByLabelText('E-mail').props.value).toBe('rayan@balance.app');
  });

  it('leaves the session signed out', async () => {
    await submitAndFail();

    expect(useSessionStore.getState().status).toBe('signedOut');
  });
});

describe('the form', () => {
  it('offers a way to register instead', () => {
    respondWith(200, {});
    renderSignIn();

    // Spec AUTH AC2 needs the registration screen to be reachable from here.
    expect(screen.getByText('Criar uma conta')).toBeTruthy();
  });

  it('renders no error before anything has been submitted', () => {
    respondWith(200, {});
    renderSignIn();

    expect(screen.queryByTestId('form-error')).toBeNull();
  });
});
