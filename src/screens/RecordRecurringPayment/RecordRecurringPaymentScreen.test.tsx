import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RecordRecurringPaymentScreen } from '@/screens/RecordRecurringPayment/RecordRecurringPaymentScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ year: '2026', month: '8' }),
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

const callsTo = (method: string, path: string): unknown[][] =>
  fetchMock.mock.calls.filter(
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

/** An estimated bill that has not been paid this month: `paymentId` is null. */
const unpaidLine = {
  recurringExpenseId: 'r1',
  name: 'Energia',
  personId: 'p1',
  categoryId: 'c2',
  accountId: 'a1',
  dueDay: 10,
  isEstimate: true,
  expectedAmount: 150,
  actualAmount: null,
  paymentDate: null,
  paymentId: null,
  notes: null,
  status: 0,
};

/** The same bill already paid this month: `paymentId` carries the existing payment's id. */
const paidLine = {
  ...unpaidLine,
  actualAmount: 150,
  paymentDate: '2026-08-09',
  paymentId: 'pay1',
  status: 1,
};

const monthBody = (recurringLines: unknown[]) => ({
  competenceMonth: '2026-08-01',
  variableLines: [],
  recurringLines,
  totalVariable: 0,
  totalRecurringExpected: 150,
  totalRecurringPaid: 0,
  totalCommitted: 150,
});

let client = createTestQueryClient();

const renderPayment = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RecordRecurringPaymentScreen />
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

describe('spec REC AC4 - one screen, two verbs, chosen by the line the month already carries', () => {
  it('POSTs a new payment when the line has no paymentId', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([unpaidLine]));
    stub('POST', '/recurring-expense/payment', 201, {
      id: 'pay1',
      recurringExpenseId: 'r1',
      recurringExpenseVersionId: 'v1',
      referenceMonth: '2026-08-01',
      paymentDate: '2026-08-10',
      amountPaid: 150,
      notes: null,
      accountId: null,
    });
    renderPayment();

    await waitFor(() => {
      expect(screen.getByText('Energia')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Energia'));
    fireEvent.changeText(screen.getByLabelText('Valor pago'), '150,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(callsTo('POST', '/recurring-expense/payment')).toHaveLength(1);
    });

    expect(callsTo('PUT', '/recurring-expense/payment/pay1')).toHaveLength(0);

    const sent = JSON.parse(bodySentTo('POST', '/recurring-expense/payment')!) as Record<
      string,
      unknown
    >;
    expect(sent.recurringExpenseId).toBe('r1');
    expect(sent.referenceMonth).toBe('2026-08-01');
  });

  it("PUTs to the line's own paymentId when one already exists, never a re-derived one", async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([paidLine]));
    stub('PUT', '/recurring-expense/payment/pay1', 200, {
      id: 'pay1',
      recurringExpenseId: 'r1',
      recurringExpenseVersionId: 'v1',
      referenceMonth: '2026-08-01',
      paymentDate: '2026-08-11',
      amountPaid: 172.4,
      notes: 'valor corrigido',
      accountId: null,
    });
    renderPayment();

    await waitFor(() => {
      expect(screen.getByText('Energia')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Energia'));

    await waitFor(() => {
      expect(screen.getByText('Corrigir pagamento')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Valor pago'), '172,40');
    fireEvent.changeText(screen.getByLabelText('Observações'), 'valor corrigido');
    fireEvent.press(screen.getByText('Corrigir pagamento'));

    await waitFor(() => {
      expect(callsTo('PUT', '/recurring-expense/payment/pay1')).toHaveLength(1);
    });

    // Spec REC AC4/AC5: never a second POST - that is exactly what PAYMENT_ALREADY_RECORDED guards.
    expect(callsTo('POST', '/recurring-expense/payment')).toHaveLength(0);

    const sent = JSON.parse(bodySentTo('PUT', '/recurring-expense/payment/pay1')!) as Record<
      string,
      unknown
    >;
    expect(sent.amountPaid).toBe(172.4);
    expect(sent.notes).toBe('valor corrigido');
    // Spec REC AC5: a correction carries only amount, date, notes and account - never the reference
    // month or the recurring expense id, which are not the client's to move.
    expect(sent).not.toHaveProperty('referenceMonth');
    expect(sent).not.toHaveProperty('recurringExpenseId');
  });

  it('refreshes the month after recording a payment', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([unpaidLine]));
    stub('POST', '/recurring-expense/payment', 201, {
      id: 'pay1',
      recurringExpenseId: 'r1',
      recurringExpenseVersionId: 'v1',
      referenceMonth: '2026-08-01',
      paymentDate: '2026-08-10',
      amountPaid: 150,
      notes: null,
      accountId: null,
    });
    renderPayment();

    await waitFor(() => {
      expect(screen.getByText('Energia')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Energia'));
    fireEvent.changeText(screen.getByLabelText('Valor pago'), '150,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/8')).toHaveLength(2);
    });
  });
});

describe("when the API rejects the payment because the bill is archived", () => {
  it('shows the message the API sent', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody([unpaidLine]));
    stub('POST', '/recurring-expense/payment', 400, {
      errorMessages: ['Esta conta recorrente está arquivada.'],
    });
    renderPayment();

    await waitFor(() => {
      expect(screen.getByText('Energia')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Energia'));
    fireEvent.changeText(screen.getByLabelText('Valor pago'), '150,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(screen.getByText('Esta conta recorrente está arquivada.')).toBeTruthy();
    });
  });
});
