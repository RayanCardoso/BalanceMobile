import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { IncomeScreen } from '@/screens/Income/IncomeScreen';
import { RecordIncomePaymentScreen } from '@/screens/RecordIncomePayment/RecordIncomePaymentScreen';
import { qk } from '@/services/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

let mockParams: { year?: string; month?: string } = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
}));

/**
 * Today and the current month are pinned so every date asserted below is a literal. The payment date
 * defaults to 3 September, and the month being viewed is August: the two are deliberately different,
 * which is the whole point of spec INC AC5.
 */
jest.mock('@/utils/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/dates'),
  currentMonth: () => ({ year: 2026, month: 8 }),
  todayApiDate: () => '2026-09-03',
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

const paymentPayload = (): Record<string, unknown> =>
  JSON.parse(bodySentTo('POST', '/income/payment')!) as Record<string, unknown>;

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

const monthBody = (referenceMonth: string, lines: unknown[], totalReceived: number) => ({
  referenceMonth,
  totalExpected: 5000,
  totalReceived,
  lines,
});

const paymentResponse = {
  id: 'pay1',
  incomeSourceId: 's1',
  incomeSourceVersionId: 'v1',
  paymentDate: '2026-09-03',
  referenceMonth: '2026-08-01',
  amountReceived: 5000,
  notes: null,
};

let client = createTestQueryClient();

const renderPaymentScreen = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RecordIncomePaymentScreen />
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

/** The source picker lists the reference month's sources, so it waits for that month to arrive. */
const chooseSalary = async (): Promise<void> => {
  await waitFor(() => {
    expect(within(screen.getByTestId('income-source-picker')).getByText('Salário')).toBeTruthy();
  });

  fireEvent.press(within(screen.getByTestId('income-source-picker')).getByText('Salário'));
};

/**
 * Spec INC AC5 and the story's Independent Test: "record a payment dated 3 September for reference
 * month August".
 *
 * Both dates are asserted, and asserted to differ. A form that reused the payment date for the
 * reference month would satisfy an assertion on either date alone and would move the salary into the
 * wrong month.
 */
describe('the reference month and the payment date (spec INC AC5)', () => {
  it('sends a payment dated 3 September against reference month August', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 201, paymentResponse);
    renderPaymentScreen();

    await chooseSalary();

    expect(screen.getByLabelText('Data do pagamento').props.value).toBe('2026-09-03');
    expect(screen.getByText('Agosto de 2026')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    expect(paymentPayload().paymentDate).toBe('2026-09-03');
    expect(paymentPayload().referenceMonth).toBe('2026-08-01');
    expect(paymentPayload().paymentDate).not.toBe(paymentPayload().referenceMonth);
  });

  it('sends the whole payload as the API declares it', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 201, paymentResponse);
    renderPaymentScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/income/payment')).toBe(
      '{"incomeSourceId":"s1","paymentDate":"2026-09-03","referenceMonth":"2026-08-01","amountReceived":5000,"notes":null}'
    );
  });

  it('moves the reference month on its own, leaving the payment date where it was', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('GET', '/income/2026/7', 200, monthBody('2026-07-01', [salary], 0));
    stub('POST', '/income/payment', 201, { ...paymentResponse, referenceMonth: '2026-07-01' });
    renderPaymentScreen();

    await waitFor(() => {
      expect(client.getQueryData(qk.incomeMonth(2026, 8))).toBeDefined();
    });

    fireEvent.press(screen.getByText('Mês anterior'));

    await waitFor(() => {
      expect(screen.getByText('Julho de 2026')).toBeTruthy();
    });

    // July's sources have to arrive before one of them can be chosen: moving the month clears the
    // picker rather than leaving August's list in place under a July heading.
    await chooseSalary();

    expect(screen.getByLabelText('Data do pagamento').props.value).toBe('2026-09-03');

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    expect(paymentPayload().referenceMonth).toBe('2026-07-01');
    expect(paymentPayload().paymentDate).toBe('2026-09-03');
  });

  it('sends the payment date the user typed rather than the default', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 201, paymentResponse);
    renderPaymentScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Data do pagamento'), '2026-08-05');
    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    expect(paymentPayload().paymentDate).toBe('2026-08-05');
    expect(paymentPayload().referenceMonth).toBe('2026-08-01');
  });
});

/**
 * Spec INC AC6 - "refresh the month so the new received amount and status appear without a manual
 * reload".
 *
 * The month screen is rendered beside the form, and nothing in the test reloads it. Its line moves
 * from Pendente / R$ 0,00 to Recebido / R$ 5.000,00 only because the mutation invalidated the key the
 * month query registered under.
 */
describe('the month after a payment (spec INC AC6)', () => {
  it('shows the new received amount and status without a manual reload', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 201, paymentResponse);

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <IncomeScreen />
        <RecordIncomePaymentScreen />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('income-received-s1')).toBeTruthy();
    });

    expect(within(screen.getByTestId('income-received-s1')).getByText('R$ 0,00')).toBeTruthy();
    expect(within(screen.getByTestId('income-status-s1')).getByText('Pendente')).toBeTruthy();

    fireEvent.press(within(screen.getByTestId('income-source-picker')).getByText('Salário'));
    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');

    stub(
      'GET',
      '/income/2026/8',
      200,
      monthBody('2026-08-01', [{ ...salary, receivedAmount: 5000, status: 1 }], 5000)
    );
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(within(screen.getByTestId('income-received-s1')).getByText('R$ 5.000,00')).toBeTruthy();
    });

    expect(within(screen.getByTestId('income-status-s1')).getByText('Recebido')).toBeTruthy();
  });
});

/**
 * Spec INC AC9 - income allows more than one payment against the same source in the same reference
 * month, unlike a recurring bill. Nothing client-side stands in the way of the second one.
 */
describe('a second payment for the same source and month (spec INC AC9)', () => {
  it('is sent rather than refused', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 201, paymentResponse);
    renderPaymentScreen();

    await chooseSalary();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '800,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(
        ([url, init]) =>
          url === `${BASE}/income/payment` && (init as { method: string }).method === 'POST'
      );

      expect(posts).toHaveLength(2);
      expect(JSON.parse((posts[1]![1] as { body: string }).body).amountReceived).toBe(800);
    });
  });
});

/** Spec INC AC8 - the API's messages reach the screen untranslated (MAD-004). */
describe('when the API rejects the payment', () => {
  it('shows every message the API sent, word for word', async () => {
    stub('GET', '/income/2026/8', 200, monthBody('2026-08-01', [salary], 0));
    stub('POST', '/income/payment', 400, {
      errorMessages: ['O valor recebido deve ser maior que zero.', 'A fonte de renda está arquivada.'],
    });
    renderPaymentScreen();

    await chooseSalary();

    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('O valor recebido deve ser maior que zero.')).toBeTruthy();
    expect(screen.getByText('A fonte de renda está arquivada.')).toBeTruthy();
  });
});
