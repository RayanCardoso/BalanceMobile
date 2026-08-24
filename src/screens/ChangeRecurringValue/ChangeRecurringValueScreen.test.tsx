import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ChangeRecurringValueScreen } from '@/screens/ChangeRecurringValue/ChangeRecurringValueScreen';
import { pickDate } from '@/utils/testDate';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * Os parâmetros da rota, trocáveis por teste: a tela tem duas portas de entrada e elas se distinguem
 * exatamente por este objeto - o menu de uma linha do mês manda a conta junto, a rota direta não.
 */
const TODAY = '2026-08-14';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
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

const changePayload = (): Record<string, unknown> =>
  JSON.parse(bodySentTo('PUT', '/RecurringExpense/value')!) as Record<string, unknown>;

const bill = {
  id: 'r1',
  name: 'Aluguel',
  personId: 'p1',
  categoryId: 'c1',
  accountId: 'a1',
  dueDay: 10,
  isEstimate: false,
  archived: false,
  versions: [
    {
      id: 'v1',
      recurringExpenseId: 'r1',
      amount: 2250,
      validityStart: '2026-01-01',
      validityEnd: null,
      changeReason: '',
    },
  ],
};

let client = createTestQueryClient();

const renderScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <ChangeRecurringValueScreen />
    </Wrapper>
  );
};

const selectBillAndFill = (amount: string, validityStart: string, reason: string): void => {
  fireEvent.press(screen.getByText('Aluguel'));
  fireEvent.changeText(screen.getByLabelText('Novo valor'), amount);
  pickDate('Início da vigência', TODAY, validityStart);
  fireEvent.changeText(screen.getByLabelText('Motivo da alteração'), reason);
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
  mockParams = {};
  stub('GET', '/RecurringExpense', 200, { recurringExpenses: [bill] });
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

describe('changing a recurring bills base value (spec REC AC6)', () => {
  it('sends the recurring expense id, the new amount, the validity start and the change reason', async () => {
    stub('PUT', '/RecurringExpense/value', 200, {
      ...bill,
      versions: [...bill.versions, { ...bill.versions[0], id: 'v2', amount: 2400, validityStart: '2026-09-01' }],
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });

    selectBillAndFill('2400,00', '2026-09-01', 'Reajuste anual');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(bodySentTo('PUT', '/RecurringExpense/value')).toBe(
        '{"recurringExpenseId":"r1","amount":2400,"validityStart":"2026-09-01","changeReason":"Reajuste anual"}'
      );
    });
  });
});

describe('when the API rejects the change reason', () => {
  it('shows the message the API sent without a client-side check of its own', async () => {
    stub('PUT', '/RecurringExpense/value', 400, { errorMessages: ['O motivo é obrigatório.'] });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });

    // Left empty on purpose - the API's own validation is what this test proves renders.
    selectBillAndFill('2400,00', '2026-09-01', '');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(screen.getByText('O motivo é obrigatório.')).toBeTruthy();
    });

    expect(changePayload().changeReason).toBe('');
  });
});

describe('when the API rejects the validity start', () => {
  it('shows the message the API sent without a client-side date-ordering check', async () => {
    stub('PUT', '/RecurringExpense/value', 400, {
      errorMessages: ['A vigência deve começar depois da versão atual.'],
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });

    // An earlier date than the current version's own validity start - the client sends it as typed.
    selectBillAndFill('2400,00', '2025-01-01', 'Reajuste anual');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(screen.getByText('A vigência deve começar depois da versão atual.')).toBeTruthy();
    });

    expect(changePayload().validityStart).toBe('2025-01-01');
  });
});

/**
 * Vindo do menu de uma linha do mês a conta já foi escolhida, e mostrar o seletor de novo seria
 * pedir duas vezes a mesma resposta - com a chance de a segunda contradizer a primeira.
 */
describe('aberta pelo menu de uma conta do mês', () => {
  it('não pede a conta de novo e envia a que o menu escolheu', async () => {
    mockParams = { recurringExpenseId: 'r1' };
    stub('PUT', '/RecurringExpense/value', 200, {
      ...bill,
      versions: [
        ...bill.versions,
        { ...bill.versions[0], id: 'v2', amount: 2400, validityStart: '2026-09-01' },
      ],
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('recurring-bill-name')).toHaveTextContent('Aluguel');
    });

    expect(screen.queryByTestId('recurring-bill-picker')).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Novo valor'), '2400,00');
    fireEvent.changeText(screen.getByLabelText('Início da vigência'), '2026-09-01');
    fireEvent.changeText(screen.getByLabelText('Motivo da alteração'), 'Reajuste anual');
    fireEvent.press(screen.getByText('Salvar novo valor'));

    await waitFor(() => {
      expect(changePayload().recurringExpenseId).toBe('r1');
    });
  });
});
