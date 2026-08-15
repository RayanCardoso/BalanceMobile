import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RegisterScreen } from '@/screens/Register/RegisterScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  return {
    Link: ({ children }: { children: ReactNode }) => react.createElement(rn.Text, null, children),
  };
});

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

const renderSignUp = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RegisterScreen />
    </Wrapper>
  );
};

const fillAndSubmit = (): void => {
  fireEvent.changeText(screen.getByLabelText('Nome'), 'Rayan');
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'rayan@balance.app');
  fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo123');
  fireEvent.press(screen.getByText('Criar conta'));
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

describe('registering', () => {
  it('sends the name, email and password the user typed', async () => {
    respondWith(201, { name: 'Rayan', token: 'issued-token' });
    renderSignUp();

    fillAndSubmit();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(lastUrl()).toBe('http://10.0.2.2:5126/api/User');
    expect(lastBody()).toBe(
      '{"name":"Rayan","email":"rayan@balance.app","password":"segredo123"}'
    );
  });

  it('signs the new account in with the token it was issued', async () => {
    respondWith(201, { name: 'Rayan', token: 'issued-token' });
    renderSignUp();

    fillAndSubmit();

    // Spec AUTH AC2: the dashboard follows from the session the guard reads, not from a navigation
    // call on this screen.
    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedIn');
    });

    expect(useSessionStore.getState().token).toBe('issued-token');
  });
});

describe('when the API rejects the registration', () => {
  it("shows every message the API returned, in its own wording", async () => {
    respondWith(400, {
      errorMessages: ['E-mail já cadastrado.', 'A senha deve ter no mínimo 6 caracteres.'],
    });
    renderSignUp();

    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('E-mail já cadastrado.')).toBeTruthy();
    });

    // MAD-004, and L-003: the response named two problems, so the user has to be told both.
    expect(screen.getByText('A senha deve ter no mínimo 6 caracteres.')).toBeTruthy();
    expect(useSessionStore.getState().status).toBe('signedOut');
  });
});

describe('the form', () => {
  it('offers a way back to sign-in', () => {
    respondWith(201, {});
    renderSignUp();

    expect(screen.getByText('Já tenho uma conta')).toBeTruthy();
  });

  it('masks the password and leaves the name and the e-mail readable', () => {
    respondWith(201, {});
    renderSignUp();

    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);

    // The negative half is the point: a `Field` masking every input would satisfy the assertion
    // above and hide the two fields the user has every reason to read back.
    expect(screen.getByLabelText('E-mail').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Nome').props.secureTextEntry).toBe(false);
  });
});
