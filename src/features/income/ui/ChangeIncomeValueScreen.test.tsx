import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { ChangeIncomeValueScreen } from '@/features/income/ui/ChangeIncomeValueScreen';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

let mockParams: { year?: string; month?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

// Pinned so the validity start's default is a literal rather than a value recomputed from today.
jest.mock('@/shared/lib/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/shared/lib/dates'),
  currentMonth: () => ({ year: 2026, month: 8 }),
  todayApiDate: () => '2026-08-14',
}));

const BASE = 'http://localhost:5126/api';

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

const changePayload = (): Record<string, unknown> =>
  JSON.parse(bodySentTo('PUT', '/income/value')!) as Record<string, unknown>;

const salary = {
  incomeSourceId: 's1',
  name: 'Salário',
  type: 0,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 0,
  status: 0,
};

const augustBody = {
  referenceMonth: '2026-08-01',
  totalExpected: 5000,
  totalReceived: 0,
  lines: [salary],
};

const versionResponse = {
  id: 'v2',
  incomeSourceId: 's1',
  amount: 5500,
  expectedDay: 6,
  validityStart: '2026-08-01',
  validityEnd: null,
  changeReason: 'Dissídio anual',
};

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <ChangeIncomeValueScreen />
    </Wrapper>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { year: '2026', month: '8' };
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

const chooseSalary = async (): Promise<void> => {
  await waitFor(() => {
    expect(within(screen.getByTestId('income-source-picker')).getByText('Salário')).toBeTruthy();
  });

  fireEvent.press(within(screen.getByTestId('income-source-picker')).getByText('Salário'));
};

/**
 * Spec INC AC7 names four values, and the literal body below pins all four at once (L-003, L-010).
 * A change is a new version rather than an edit, which is why the validity start travels with it.
 */
describe('changing a recurring source value (spec INC AC7)', () => {
  it('sends the new amount, the new expected day, the validity start and the reason', async () => {
    stub('GET', '/income/2026/8', 200, augustBody);
    stub('PUT', '/income/value', 200, versionResponse);
    renderScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Novo valor'), '5500,00');
    fireEvent.changeText(screen.getByLabelText('Novo dia esperado'), '6');
    fireEvent.changeText(screen.getByLabelText('Início da vigência'), '2026-08-01');
    fireEvent.changeText(screen.getByLabelText('Motivo da alteração'), 'Dissídio anual');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(bodySentTo('PUT', '/income/value')).toBeDefined();
    });

    expect(bodySentTo('PUT', '/income/value')).toBe(
      '{"incomeSourceId":"s1","amount":5500,"expectedDay":6,"validityStart":"2026-08-01","changeReason":"Dissídio anual"}'
    );
  });

  it('offers today as the validity start and sends it when it is left alone', async () => {
    stub('GET', '/income/2026/8', 200, augustBody);
    stub('PUT', '/income/value', 200, { ...versionResponse, validityStart: '2026-08-14' });
    renderScreen();

    await chooseSalary();

    expect(screen.getByLabelText('Início da vigência').props.value).toBe('2026-08-14');

    fireEvent.changeText(screen.getByLabelText('Novo valor'), '5500,00');
    fireEvent.changeText(screen.getByLabelText('Novo dia esperado'), '6');
    fireEvent.changeText(screen.getByLabelText('Motivo da alteração'), 'Dissídio anual');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(bodySentTo('PUT', '/income/value')).toBeDefined();
    });

    expect(changePayload().validityStart).toBe('2026-08-14');
  });
});

/**
 * Spec INC AC8. The reason is required by the API, not by the app: an empty one is sent and the
 * API's own sentence is what the user reads (MAD-001, MAD-004). A client-side block here would be a
 * second copy of the rule, and the app would keep showing its own wording after the API changed.
 */
describe('when the reason is empty', () => {
  it('sends the empty reason rather than refusing to submit', async () => {
    stub('GET', '/income/2026/8', 200, augustBody);
    stub('PUT', '/income/value', 400, {
      errorMessages: ['O motivo da alteração é obrigatório.'],
    });
    renderScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Novo valor'), '5500,00');
    fireEvent.changeText(screen.getByLabelText('Novo dia esperado'), '6');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(bodySentTo('PUT', '/income/value')).toBeDefined();
    });

    expect(changePayload().changeReason).toBe('');
  });

  it("shows the API's own message", async () => {
    stub('GET', '/income/2026/8', 200, augustBody);
    stub('PUT', '/income/value', 400, {
      errorMessages: ['O motivo da alteração é obrigatório.'],
    });
    renderScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Novo valor'), '5500,00');
    fireEvent.changeText(screen.getByLabelText('Novo dia esperado'), '6');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('O motivo da alteração é obrigatório.')).toBeTruthy();
  });
});
