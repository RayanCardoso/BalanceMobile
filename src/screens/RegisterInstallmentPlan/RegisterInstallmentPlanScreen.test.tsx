import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { RegisterInstallmentPlanScreen } from '@/screens/RegisterInstallmentPlan/RegisterInstallmentPlanScreen';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/** Pinned so the start date the form submits is a literal (lesson L-010). */
jest.mock('@/utils/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/dates'),
  todayApiDate: () => '2026-09-15',
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

const rayan = { id: 'p1', name: 'Rayan', description: null, isAccountOwner: true };
const electronics = { id: 'c1', name: 'Eletrônicos', description: null, priority: 1 };
const card = {
  id: 'a1',
  name: 'Nubank',
  institution: 'Nubank',
  personId: 'p1',
  closingDay: 20,
  dueDay: 27,
  limit: 5000,
};

const installment = (id: string, number: number, amount: number, competenceMonth: string) => ({
  id,
  name: 'Notebook',
  personId: 'p1',
  type: 0,
  amount,
  categoryId: 'c1',
  accountId: 'a1',
  date: '2026-09-15',
  competenceMonth,
  installmentNumber: number,
  installmentPlanId: 'plan1',
});

/**
 * The story's Independent Test: 100,00 in 3 gives 33,33 / 33,33 / 33,34.
 *
 * The residual cent is on the last installment because that is where the **API** puts it. These are
 * the values the response carries, and the screen has to render them rather than divide anything
 * itself (MAD-001): a client splitting 100 by 3 would show 33,33 three times and lose a cent.
 */
const planResponse = {
  id: 'plan1',
  name: 'Notebook',
  personId: 'p1',
  totalAmount: 100,
  installmentCount: 3,
  categoryId: 'c1',
  accountId: 'a1',
  startDate: '2026-09-15',
  endDate: '2026-11-01',
  installments: [
    installment('i1', 1, 33.33, '2026-09-01'),
    installment('i2', 2, 33.33, '2026-10-01'),
    installment('i3', 3, 33.34, '2026-11-01'),
  ],
};

let client = createTestQueryClient();

const renderForm = (): void => {
  stub('GET', '/person', 200, { people: [rayan] });
  stub('GET', '/category', 200, { categories: [electronics] });
  stub('GET', '/account', 200, { accounts: [card] });

  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RegisterInstallmentPlanScreen />
    </Wrapper>
  );
};

/** The pickers list catalogue data, so the form is only usable once it has arrived. */
const fillPlan = async (): Promise<void> => {
  await waitFor(() => {
    expect(within(screen.getByTestId('category-picker')).getByText('Eletrônicos')).toBeTruthy();
    expect(within(screen.getByTestId('account-picker')).getByText('Nubank')).toBeTruthy();
  });

  fireEvent.press(within(screen.getByTestId('category-picker')).getByText('Eletrônicos'));
  fireEvent.press(within(screen.getByTestId('account-picker')).getByText('Nubank'));
  fireEvent.changeText(screen.getByLabelText('Nome'), 'Notebook');
  fireEvent.changeText(screen.getByLabelText('Valor total'), '100,00');
  fireEvent.changeText(screen.getByLabelText('Número de parcelas'), '3');
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

/** Spec INST AC1 - "send the total amount, the installment count and the start date". */
describe('the payload (spec INST AC1)', () => {
  it('sends the total, the count and the start date', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);
    renderForm();

    await fillPlan();

    fireEvent.press(screen.getByText('Registrar parcelamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense/installment-plan')).toBeDefined();
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/expense/installment-plan')).toBe(
      '{"name":"Notebook","personId":"p1","totalAmount":100,"installmentCount":3,"categoryId":"c1","accountId":"a1","startDate":"2026-09-15"}'
    );

    const payload = JSON.parse(bodySentTo('POST', '/expense/installment-plan')!) as Record<
      string,
      unknown
    >;
    // The count is the integer the API's `int` expects, not the typed string.
    expect(payload.installmentCount).toBe(3);
  });
});

/**
 * Spec INST AC2 and AC3, and the story's Independent Test: "Register 100,00 in 3 installments and
 * see 33,33 / 33,33 / 33,34".
 *
 * Every amount is asserted **inside its own installment's row**, so the uneven one has to be on the
 * third. A screen dividing the total itself would render 33,33 three times and pass any assertion
 * that only counted rows or looked for 33,33 anywhere on the page.
 */
describe('the plan the API generated (spec INST AC2, AC3)', () => {
  it('shows how many installments were created and the amount of each', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);
    renderForm();

    await fillPlan();

    fireEvent.press(screen.getByText('Registrar parcelamento'));

    await waitFor(() => {
      expect(screen.getByTestId('plan-summary')).toBeTruthy();
    });

    expect(within(screen.getByTestId('plan-count')).getByText('3 parcelas criadas')).toBeTruthy();

    expect(within(screen.getByTestId('installment-1')).getByText('R$ 33,33')).toBeTruthy();
    expect(within(screen.getByTestId('installment-2')).getByText('R$ 33,33')).toBeTruthy();
    expect(within(screen.getByTestId('installment-3')).getByText('R$ 33,34')).toBeTruthy();

    // The residual cent is where the API put it, not spread by a client-side division (MAD-001).
    expect(within(screen.getByTestId('installment-3')).queryByText('R$ 33,33')).toBeNull();
  });

  it('shows each installment its position out of the total', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);
    renderForm();

    await fillPlan();

    fireEvent.press(screen.getByText('Registrar parcelamento'));

    await waitFor(() => {
      expect(screen.getByTestId('plan-summary')).toBeTruthy();
    });

    expect(within(screen.getByTestId('installment-1')).getByText('Parcela 1 de 3')).toBeTruthy();
    expect(within(screen.getByTestId('installment-2')).getByText('Parcela 2 de 3')).toBeTruthy();
    expect(within(screen.getByTestId('installment-3')).getByText('Parcela 3 de 3')).toBeTruthy();
  });

  it('names the month each installment landed in', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);
    renderForm();

    await fillPlan();

    fireEvent.press(screen.getByText('Registrar parcelamento'));

    await waitFor(() => {
      expect(screen.getByTestId('plan-summary')).toBeTruthy();
    });

    // Three consecutive months, each read off the installment's own `competenceMonth` (MAD-003).
    expect(within(screen.getByTestId('installment-1')).getByText('Setembro de 2026')).toBeTruthy();
    expect(within(screen.getByTestId('installment-2')).getByText('Outubro de 2026')).toBeTruthy();
    expect(within(screen.getByTestId('installment-3')).getByText('Novembro de 2026')).toBeTruthy();
  });

  it('shows no plan before one has been registered', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);
    renderForm();

    await fillPlan();

    expect(screen.queryByTestId('plan-summary')).toBeNull();
  });
});

/** Spec INST AC4 - "IF the installment count is rejected THEN show the API's message" (MAD-004). */
describe('when the API rejects the installment count', () => {
  it("shows the API's message word for word", async () => {
    stub('POST', '/expense/installment-plan', 400, {
      errorMessages: ['O número de parcelas deve estar entre 2 e 48.'],
    });
    renderForm();

    await fillPlan();

    fireEvent.changeText(screen.getByLabelText('Número de parcelas'), '99');
    fireEvent.press(screen.getByText('Registrar parcelamento'));

    await waitFor(() => {
      expect(screen.getAllByTestId('form-error').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('O número de parcelas deve estar entre 2 e 48.')).toBeTruthy();
    // A rejected plan generates nothing, so there is no summary to read.
    expect(screen.queryByTestId('plan-summary')).toBeNull();
  });
});
