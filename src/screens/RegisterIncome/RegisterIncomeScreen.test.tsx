import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RegisterIncomeSourceScreen } from '@/screens/RegisterIncome/RegisterIncomeScreen';
import { qk } from '@/services/queryKeys';
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

const registered = {
  id: 's1',
  name: 'Salário',
  type: 0,
  personId: 'p1',
  archived: false,
  amount: 5000,
  expectedDay: 5,
};

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RegisterIncomeSourceScreen />
    </Wrapper>
  );
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

/**
 * The form renders before the person list arrives, and a source cannot be submitted without a
 * person. Waiting on the cached list rather than on the first field is what makes the press below
 * land on a form that is actually ready.
 */
const openForm = async (people: unknown[]): Promise<void> => {
  stub('GET', '/person', 200, { people });
  renderScreen();

  await waitFor(() => {
    expect(client.getQueryData(qk.people())).toBeDefined();
  });
};

describe('registering a recurring source (spec INC AC3)', () => {
  it('sends the name, the type, the person, the amount and the expected day', async () => {
    await openForm([person('p1', 'Rayan')]);
    stub('POST', '/income', 201, registered);

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Salário');
    fireEvent.changeText(screen.getByLabelText('Valor'), '5000,00');
    fireEvent.changeText(screen.getByLabelText('Dia esperado'), '5');
    fireEvent.press(screen.getByText('Cadastrar fonte'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income')).toBeDefined();
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/income')).toBe(
      '{"name":"Salário","type":0,"personId":"p1","amount":5000,"expectedDay":5}'
    );
  });
});

/**
 * Spec INC AC4 - "send neither an amount nor an expected day".
 *
 * The API rejects a Variable source carrying either field, so "absent" and "zero" are not
 * interchangeable. The fields are not rendered at all, and the payload is asserted to lack both keys
 * rather than merely to carry falsy values.
 */
describe('registering a variable source (spec INC AC4)', () => {
  it('hides the amount and the expected day once the type is variable', async () => {
    await openForm([person('p1', 'Rayan')]);

    expect(screen.getByLabelText('Valor')).toBeTruthy();

    fireEvent.press(screen.getByText('Variável'));

    expect(screen.queryByLabelText('Valor')).toBeNull();
    expect(screen.queryByLabelText('Dia esperado')).toBeNull();
  });

  it('sends neither an amount nor an expected day', async () => {
    await openForm([person('p1', 'Rayan')]);
    stub('POST', '/income', 201, {
      id: 's2',
      name: 'Freelance',
      type: 1,
      personId: 'p1',
      archived: false,
      amount: null,
      expectedDay: null,
    });

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Freelance');
    fireEvent.press(screen.getByText('Variável'));
    fireEvent.press(screen.getByText('Cadastrar fonte'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income')).toBeDefined();
    });

    const sent = bodySentTo('POST', '/income');
    expect(sent).toBe('{"name":"Freelance","type":1,"personId":"p1"}');

    const payload = JSON.parse(sent!) as Record<string, unknown>;
    expect('amount' in payload).toBe(false);
    expect('expectedDay' in payload).toBe(false);
  });
});

// Spec CAT AC6, which this form needs because an income source belongs to a Person.
describe('choosing the person', () => {
  it('preselects the only person and sends their id without showing a picker', async () => {
    await openForm([person('p1', 'Rayan')]);
    stub('POST', '/income', 201, registered);

    expect(screen.queryByText('Rayan')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Freelance');
    fireEvent.press(screen.getByText('Variável'));
    fireEvent.press(screen.getByText('Cadastrar fonte'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income')).toBeDefined();
    });

    expect((JSON.parse(bodySentTo('POST', '/income')!) as Record<string, unknown>).personId).toBe(
      'p1'
    );
  });

  it('preselects nobody with two people, and sends whichever is chosen', async () => {
    await openForm([person('p1', 'Rayan'), person('p2', 'Marina')]);
    stub('POST', '/income', 201, { ...registered, personId: 'p2' });

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Freelance');
    fireEvent.press(screen.getByText('Variável'));
    fireEvent.press(screen.getByText('Marina'));
    fireEvent.press(screen.getByText('Cadastrar fonte'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income')).toBeDefined();
    });

    expect((JSON.parse(bodySentTo('POST', '/income')!) as Record<string, unknown>).personId).toBe(
      'p2'
    );
  });
});

/**
 * Spec INC AC8 - the API's messages reach the screen without being translated into the app's own
 * wording (MAD-004). Two messages are returned and both are asserted: a screen rendering only the
 * first would satisfy a single-message assertion while hiding half of what the API said (L-003).
 */
describe('when the API rejects the source', () => {
  it('shows every message the API sent, word for word', async () => {
    await openForm([person('p1', 'Rayan')]);
    stub('POST', '/income', 400, {
      errorMessages: ['O nome é obrigatório.', 'O valor deve ser maior que zero.'],
    });

    fireEvent.press(screen.getByText('Cadastrar fonte'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('O nome é obrigatório.')).toBeTruthy();
    expect(screen.getByText('O valor deve ser maior que zero.')).toBeTruthy();
  });
});
