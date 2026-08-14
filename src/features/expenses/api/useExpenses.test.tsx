import { useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useExpenseMonth,
  useRegisterExpense,
  useRegisterInstallmentPlan,
} from '@/features/expenses/api/useExpenses';
import { qk } from '@/shared/api/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const BASE = 'http://localhost:5126/api';

const fetchMock = jest.fn();

const stubs = new Map<string, { status: number; body: unknown }>();

const stub = (method: string, path: string, status: number, body: unknown): void => {
  stubs.set(`${method} ${BASE}${path}`, { status, body });
};

const callsTo = (method: string, path: string): unknown[][] =>
  fetchMock.mock.calls.filter(
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

const bodySentTo = (method: string, path: string): string | undefined =>
  (callsTo(method, path)[0]?.[1] as { body?: string } | undefined)?.body;

let client = createTestQueryClient();

const renderExpenseHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

/** A one-off purchase on credit. */
const marketLine = {
  expenseId: 'e1',
  name: 'Mercado',
  type: 0,
  amount: 320.5,
  date: '2026-08-12',
  personId: 'p1',
  categoryId: 'c1',
  categoryName: 'Alimentação',
  categoryPriority: 0,
  accountId: 'a1',
  accountName: 'Nubank',
  installmentNumber: null,
  installmentCount: null,
  installmentPlanId: null,
};

/** An estimated bill that has not arrived: `actualAmount` is null, not zero. */
const energyLine = {
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

const monthBody = (competenceMonth: string, variableLines: unknown[], recurringLines: unknown[]) => ({
  competenceMonth,
  variableLines,
  recurringLines,
  totalVariable: 320.5,
  totalRecurringExpected: 150,
  totalRecurringPaid: 0,
  totalCommitted: 470.5,
});

/**
 * The purchase and the answer the API gives it.
 *
 * The purchase is dated **21 August**; the account closes on the 20th, so the API answers with a
 * competence month of **September**. The two months differ on purpose: that difference is what every
 * invalidation assertion below is built on.
 */
const creditPurchase = {
  name: 'Passagem',
  personId: 'p1',
  type: 0 as const,
  amount: 480,
  categoryId: 'c1',
  accountId: 'a1',
  date: '2026-08-21',
  competenceMonth: null,
};

const registeredInSeptember = {
  id: 'e2',
  name: 'Passagem',
  personId: 'p1',
  type: 0,
  amount: 480,
  categoryId: 'c1',
  accountId: 'a1',
  date: '2026-08-21',
  competenceMonth: '2026-09-01',
  installmentNumber: null,
  installmentPlanId: null,
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

/** 100,00 in 3 from 15 September: September, October and November (spec INST AC2). */
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

const planInput = {
  name: 'Notebook',
  personId: 'p1',
  totalAmount: 100,
  installmentCount: 3,
  categoryId: 'c1',
  accountId: 'a1',
  startDate: '2026-09-15',
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

describe('reading the expense month', () => {
  it('reads the month route and carries every field of both groups', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody('2026-08-01', [marketLine], [energyLine]));

    const { result } = renderExpenseHook(() => useExpenseMonth(2026, 8));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Lesson L-004: the fields the screen reads are asserted, not only the totals.
    expect(result.current.data?.variableLines).toEqual([marketLine]);
    expect(result.current.data?.recurringLines).toEqual([energyLine]);
    expect(result.current.data?.totalCommitted).toBe(470.5);
  });

  it("keeps an unpaid bill's actual amount null rather than zero", async () => {
    stub('GET', '/expense/2026/8', 200, monthBody('2026-08-01', [], [energyLine]));

    const { result } = renderExpenseHook(() => useExpenseMonth(2026, 8));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.recurringLines[0]?.actualAmount).toBeNull();
    expect(result.current.data?.recurringLines[0]?.expectedAmount).toBe(150);
  });
});

describe('registering an expense', () => {
  // Spec EXP AC2 and AC3 - the seven fields go out, and the competence month is left for the API.
  it('sends the date and no competence month of its own', async () => {
    stub('POST', '/expense', 201, registeredInSeptember);

    const { result } = renderExpenseHook(() => useRegisterExpense());
    result.current.mutate(creditPurchase);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/expense')).toBe(
      '{"name":"Passagem","personId":"p1","type":0,"amount":480,"categoryId":"c1","accountId":"a1","date":"2026-08-21","competenceMonth":null}'
    );

    const payload = JSON.parse(bodySentTo('POST', '/expense')!) as Record<string, unknown>;
    expect(payload.competenceMonth).toBeNull();
    expect(payload.date).toBe('2026-08-21');
  });

  // Spec EXP AC4 - an explicit override is what goes out instead, and the purchase date is untouched.
  it('sends the chosen competence month when the user overrides it', async () => {
    stub('POST', '/expense', 201, { ...registeredInSeptember, competenceMonth: '2026-10-01' });

    const { result } = renderExpenseHook(() => useRegisterExpense());
    result.current.mutate({ ...creditPurchase, competenceMonth: '2026-10-01' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const payload = JSON.parse(bodySentTo('POST', '/expense')!) as Record<string, unknown>;
    expect(payload.competenceMonth).toBe('2026-10-01');
    expect(payload.date).toBe('2026-08-21');
  });

  /**
   * Spec EXP AC5 and MAD-003, and the story's Independent Test: an expense dated 21 August against an
   * account closing on the 20th lands in September.
   *
   * September is asserted to have read the API again and August asserted **not** to have. A hook
   * invalidating the purchase date's month — or the month the screen was showing — would refresh a
   * list the expense is not in, and would pass a test that looked at only one of the two months.
   */
  it("refreshes the month the API returned and leaves the purchase date's month alone", async () => {
    stub('GET', '/expense/2026/8', 200, monthBody('2026-08-01', [marketLine], []));
    stub('GET', '/expense/2026/9', 200, monthBody('2026-09-01', [], []));
    stub('POST', '/expense', 201, registeredInSeptember);

    const { result } = renderExpenseHook(() => ({
      // The month on screen is August: the same month the purchase is dated in.
      augustMonth: useExpenseMonth(2026, 8),
      septemberMonth: useExpenseMonth(2026, 9),
      register: useRegisterExpense(),
    }));

    await waitFor(() => {
      expect(result.current.augustMonth.isSuccess).toBe(true);
      expect(result.current.septemberMonth.isSuccess).toBe(true);
    });

    stub(
      'GET',
      '/expense/2026/9',
      200,
      monthBody('2026-09-01', [{ ...marketLine, expenseId: 'e2', name: 'Passagem', amount: 480 }], [])
    );
    result.current.register.mutate(creditPurchase);

    await waitFor(() => {
      expect(result.current.septemberMonth.data?.variableLines.map((line) => line.name)).toEqual([
        'Passagem',
      ]);
    });

    expect(callsTo('GET', '/expense/2026/9')).toHaveLength(2);
    expect(callsTo('GET', '/expense/2026/8')).toHaveLength(1);
  });

  /**
   * The dashboard of the month the expense landed in shows a committed total that is now wrong, and
   * the one on screen does not. Both are asserted, for the reason above: refreshing every dashboard
   * would pass a one-sided check while making the criterion meaningless.
   */
  it("refreshes the returned month's dashboard and not the viewed month's", async () => {
    stub('POST', '/expense', 201, registeredInSeptember);

    const augustDashboard = jest.fn(async () => ({ totalCommitted: 470.5 }));
    const septemberDashboard = jest.fn(async () => ({ totalCommitted: 0 }));

    const { result } = renderExpenseHook(() => ({
      august: useQuery({ queryKey: qk.dashboard(2026, 8), queryFn: augustDashboard }),
      september: useQuery({ queryKey: qk.dashboard(2026, 9), queryFn: septemberDashboard }),
      register: useRegisterExpense(),
    }));

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.register.mutate(creditPurchase);

    await waitFor(() => {
      expect(septemberDashboard).toHaveBeenCalledTimes(2);
    });

    expect(augustDashboard).toHaveBeenCalledTimes(1);
  });
});

describe('registering an installment plan', () => {
  // Spec INST AC1 - the total, the count and the start date. The split itself is the API's (MAD-001).
  it('sends the total amount, the installment count and the start date', async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);

    const { result } = renderExpenseHook(() => useRegisterInstallmentPlan());
    result.current.mutate(planInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('POST', '/expense/installment-plan')).toBe(
      '{"name":"Notebook","personId":"p1","totalAmount":100,"installmentCount":3,"categoryId":"c1","accountId":"a1","startDate":"2026-09-15"}'
    );
  });

  /**
   * Spec INST AC2/AC3 with MAD-003: one decision produces three charges in three different months,
   * and each carries its own competence month. All three have to read the API again; August, which
   * no installment touches, must not. A hook invalidating only the first installment's month would
   * leave October and November showing a total that is already wrong.
   */
  it('refreshes every month the generated installments touch, and no other', async () => {
    stub('GET', '/expense/2026/8', 200, monthBody('2026-08-01', [marketLine], []));
    stub('GET', '/expense/2026/9', 200, monthBody('2026-09-01', [], []));
    stub('GET', '/expense/2026/10', 200, monthBody('2026-10-01', [], []));
    stub('GET', '/expense/2026/11', 200, monthBody('2026-11-01', [], []));
    stub('POST', '/expense/installment-plan', 201, planResponse);

    const { result } = renderExpenseHook(() => ({
      august: useExpenseMonth(2026, 8),
      september: useExpenseMonth(2026, 9),
      october: useExpenseMonth(2026, 10),
      november: useExpenseMonth(2026, 11),
      register: useRegisterInstallmentPlan(),
    }));

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
      expect(result.current.october.isSuccess).toBe(true);
      expect(result.current.november.isSuccess).toBe(true);
    });

    result.current.register.mutate(planInput);

    await waitFor(() => {
      expect(result.current.register.isSuccess).toBe(true);
    });

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/11')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/9')).toHaveLength(2);
    expect(callsTo('GET', '/expense/2026/10')).toHaveLength(2);
    expect(callsTo('GET', '/expense/2026/8')).toHaveLength(1);
  });

  it("refreshes each of those months' dashboards", async () => {
    stub('POST', '/expense/installment-plan', 201, planResponse);

    const dashboards = {
      september: jest.fn(async () => ({ totalCommitted: 0 })),
      october: jest.fn(async () => ({ totalCommitted: 0 })),
      november: jest.fn(async () => ({ totalCommitted: 0 })),
    };

    const { result } = renderExpenseHook(() => ({
      september: useQuery({ queryKey: qk.dashboard(2026, 9), queryFn: dashboards.september }),
      october: useQuery({ queryKey: qk.dashboard(2026, 10), queryFn: dashboards.october }),
      november: useQuery({ queryKey: qk.dashboard(2026, 11), queryFn: dashboards.november }),
      register: useRegisterInstallmentPlan(),
    }));

    await waitFor(() => {
      expect(result.current.september.isSuccess).toBe(true);
      expect(result.current.october.isSuccess).toBe(true);
      expect(result.current.november.isSuccess).toBe(true);
    });

    result.current.register.mutate(planInput);

    await waitFor(() => {
      expect(dashboards.november).toHaveBeenCalledTimes(2);
    });

    expect(dashboards.september).toHaveBeenCalledTimes(2);
    expect(dashboards.october).toHaveBeenCalledTimes(2);
  });
});
