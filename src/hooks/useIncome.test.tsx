import { useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useChangeIncomeValue,
  useIncomeMonth,
  useIncomeMonthSeries,
  useRegisterIncomePayment,
  useRegisterIncomeSource,
} from '@/hooks/useIncome';
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

const callsTo = (method: string, path: string): unknown[][] =>
  fetchMock.mock.calls.filter(
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

const bodySentTo = (method: string, path: string): string | undefined =>
  (callsTo(method, path)[0]?.[1] as { body?: string } | undefined)?.body;

let client = createTestQueryClient();

const renderIncomeHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

/** A recurring salary: expected 5000 on day 5, nothing received yet. */
const salaryLine = {
  incomeSourceId: 's1',
  name: 'Salário',
  type: 0,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 0,
  status: 0,
};

/** A variable source: the API sends null for both expected fields, not zero. */
const freelanceLine = {
  incomeSourceId: 's2',
  name: 'Freelance',
  type: 1,
  personId: 'p1',
  expectedAmount: null,
  expectedDay: null,
  receivedAmount: 1200,
  status: 1,
};

const august = (lines: unknown[], totalReceived: number) => ({
  referenceMonth: '2026-08-01',
  totalExpected: 5000,
  totalReceived,
  lines,
});

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

describe('reading the income month', () => {
  it('reads the month route and carries every field of every line', async () => {
    stub('GET', '/income/2026/8', 200, august([salaryLine, freelanceLine], 1200));

    const { result } = renderIncomeHook(() => useIncomeMonth(2026, 8));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Lesson L-004: the fields the screen reads are asserted, not only the totals.
    expect(result.current.data?.lines).toEqual([salaryLine, freelanceLine]);
    expect(result.current.data?.totalReceived).toBe(1200);
  });

  it("keeps a variable source's expected amount null rather than zero", async () => {
    stub('GET', '/income/2026/8', 200, august([freelanceLine], 1200));

    const { result } = renderIncomeHook(() => useIncomeMonth(2026, 8));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.lines[0]?.expectedAmount).toBeNull();
    expect(result.current.data?.lines[0]?.expectedDay).toBeNull();
  });
});

/**
 * The trend line under the month navigator on the income screen. The value of a month is
 * `totalReceived` - what actually arrived, not what was expected: the expected amount is a forecast
 * the screen already shows line by line, and plotting it would draw a history that never happened.
 */
describe('the income series (what each month received)', () => {
  const receiving = (referenceMonth: string, totalReceived: number) => ({
    referenceMonth,
    totalExpected: 5000,
    totalReceived,
    lines: [],
  });

  it('reads the five months around the one it was given and plots what each received', async () => {
    stub('GET', '/income/2026/6', 200, receiving('2026-06-01', 100));
    stub('GET', '/income/2026/7', 200, receiving('2026-07-01', 200));
    stub('GET', '/income/2026/8', 200, receiving('2026-08-01', 300));
    stub('GET', '/income/2026/9', 200, receiving('2026-09-01', 400));
    stub('GET', '/income/2026/10', 200, receiving('2026-10-01', 500));

    const { result } = renderIncomeHook(() => useIncomeMonthSeries(2026, 8));

    await waitFor(() => {
      expect(result.current.every((entry) => entry.value !== null)).toBe(true);
    });

    expect(result.current).toEqual([
      { year: 2026, month: 6, value: 100 },
      { year: 2026, month: 7, value: 200 },
      { year: 2026, month: 8, value: 300 },
      { year: 2026, month: 9, value: 400 },
      { year: 2026, month: 10, value: 500 },
    ]);
  });

  it('shares the centre month with the screen instead of requesting it twice', async () => {
    stub('GET', '/income/2026/6', 200, receiving('2026-06-01', 100));
    stub('GET', '/income/2026/7', 200, receiving('2026-07-01', 200));
    stub('GET', '/income/2026/8', 200, receiving('2026-08-01', 300));
    stub('GET', '/income/2026/9', 200, receiving('2026-09-01', 400));
    stub('GET', '/income/2026/10', 200, receiving('2026-10-01', 500));

    const { result } = renderIncomeHook(() => ({
      month: useIncomeMonth(2026, 8),
      series: useIncomeMonthSeries(2026, 8),
    }));

    await waitFor(() => {
      expect(result.current.month.isSuccess).toBe(true);
      expect(result.current.series[2]?.value).toBe(300);
    });

    expect(callsTo('GET', '/income/2026/8')).toHaveLength(1);
  });
});

describe('registering an income source', () => {
  // Spec INC AC3.
  it('sends the amount and the expected day for a recurring source', async () => {
    stub('POST', '/income', 201, {
      id: 's1',
      name: 'Salário',
      type: 0,
      personId: 'p1',
      archived: false,
      amount: 5000,
      expectedDay: 5,
    });

    const { result } = renderIncomeHook(() => useRegisterIncomeSource());
    result.current.mutate({ name: 'Salário', type: 0, personId: 'p1', amount: 5000, expectedDay: 5 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/income')).toBe(
      '{"name":"Salário","type":0,"personId":"p1","amount":5000,"expectedDay":5}'
    );
  });

  // Spec INC AC4 - "send neither an amount nor an expected day". The API rejects a Variable source
  // that carries either, so absent and zero are not interchangeable here.
  it('sends neither an amount nor an expected day for a variable source', async () => {
    stub('POST', '/income', 201, {
      id: 's2',
      name: 'Freelance',
      type: 1,
      personId: 'p1',
      archived: false,
      amount: null,
      expectedDay: null,
    });

    const { result } = renderIncomeHook(() => useRegisterIncomeSource());
    result.current.mutate({ name: 'Freelance', type: 1, personId: 'p1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const sent = bodySentTo('POST', '/income');
    expect(sent).toBe('{"name":"Freelance","type":1,"personId":"p1"}');

    const payload = JSON.parse(sent!) as Record<string, unknown>;
    expect('amount' in payload).toBe(false);
    expect('expectedDay' in payload).toBe(false);
  });

  it('makes the month read the API again, so the new source appears in it', async () => {
    stub('GET', '/income/2026/8', 200, august([salaryLine], 0));
    stub('POST', '/income', 201, {
      id: 's2',
      name: 'Freelance',
      type: 1,
      personId: 'p1',
      archived: false,
      amount: null,
      expectedDay: null,
    });

    const { result } = renderIncomeHook(() => ({
      month: useIncomeMonth(2026, 8),
      register: useRegisterIncomeSource(),
    }));

    await waitFor(() => {
      expect(result.current.month.data?.lines.map((line) => line.name)).toEqual(['Salário']);
    });

    stub('GET', '/income/2026/8', 200, august([salaryLine, freelanceLine], 1200));
    result.current.register.mutate({ name: 'Freelance', type: 1, personId: 'p1' });

    await waitFor(() => {
      expect(result.current.month.data?.lines.map((line) => line.name)).toEqual([
        'Salário',
        'Freelance',
      ]);
    });
  });
});

describe('recording an income payment', () => {
  const paymentResponse = {
    id: 'pay1',
    incomeSourceId: 's1',
    incomeSourceVersionId: 'v1',
    paymentDate: '2026-09-03',
    referenceMonth: '2026-08-01',
    amountReceived: 5000,
    notes: null,
  };

  const septemberPayment = {
    incomeSourceId: 's1',
    paymentDate: '2026-09-03',
    referenceMonth: '2026-08-01',
    amountReceived: 5000,
    notes: null,
  };

  // Spec INC AC5 - the reference month is sent separately from the payment date.
  it('sends the payment date and the reference month as two distinct dates', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);

    const { result } = renderIncomeHook(() => useRegisterIncomePayment());
    result.current.mutate(septemberPayment);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('POST', '/income/payment')).toBe(
      '{"incomeSourceId":"s1","paymentDate":"2026-09-03","referenceMonth":"2026-08-01","amountReceived":5000,"notes":null}'
    );

    const payload = JSON.parse(bodySentTo('POST', '/income/payment')!) as Record<string, unknown>;
    expect(payload.paymentDate).not.toBe(payload.referenceMonth);
  });

  /**
   * Spec INC AC6, and the story's Independent Test: "record a payment dated 3 September for reference
   * month August and see August's total change while September's does not".
   *
   * August is asserted to have read the API again and September asserted **not** to have. A hook
   * invalidating the payment date's month instead would pass a test that only looked at one of them.
   */
  it("refreshes the reference month and leaves the payment date's month alone", async () => {
    stub('GET', '/income/2026/8', 200, august([salaryLine], 0));
    stub('GET', '/income/2026/9', 200, {
      referenceMonth: '2026-09-01',
      totalExpected: 5000,
      totalReceived: 0,
      lines: [salaryLine],
    });
    stub('POST', '/income/payment', 201, paymentResponse);

    const { result } = renderIncomeHook(() => ({
      augustMonth: useIncomeMonth(2026, 8),
      septemberMonth: useIncomeMonth(2026, 9),
      pay: useRegisterIncomePayment(),
    }));

    await waitFor(() => {
      expect(result.current.augustMonth.isSuccess).toBe(true);
      expect(result.current.septemberMonth.isSuccess).toBe(true);
    });

    stub('GET', '/income/2026/8', 200, august([{ ...salaryLine, receivedAmount: 5000, status: 1 }], 5000));
    result.current.pay.mutate(septemberPayment);

    await waitFor(() => {
      expect(result.current.augustMonth.data?.totalReceived).toBe(5000);
    });

    expect(callsTo('GET', '/income/2026/8')).toHaveLength(2);
    expect(callsTo('GET', '/income/2026/9')).toHaveLength(1);
  });

  /**
   * The dashboard reads the same month and would otherwise show a figure the income screen has
   * already corrected. It is invalidated under the key `qk.dashboard` builds, which is the key T42's
   * query will register under.
   */
  it("refreshes the reference month's dashboard as well as its income month", async () => {
    stub('GET', '/income/2026/8', 200, august([salaryLine], 0));
    stub('POST', '/income/payment', 201, paymentResponse);

    const dashboardFn = jest.fn(async () => ({ totalReceived: 0 }));

    const { result } = renderIncomeHook(() => ({
      dashboard: useQuery({ queryKey: qk.dashboard(2026, 8), queryFn: dashboardFn }),
      pay: useRegisterIncomePayment(),
    }));

    await waitFor(() => {
      expect(result.current.dashboard.isSuccess).toBe(true);
    });

    expect(dashboardFn).toHaveBeenCalledTimes(1);

    result.current.pay.mutate(septemberPayment);

    await waitFor(() => {
      expect(dashboardFn).toHaveBeenCalledTimes(2);
    });
  });

  // Spec INC AC9: income sums several payments in one reference month, unlike a recurring bill,
  // which rejects a second one. Nothing here refuses the second call.
  it('allows a second payment against the same source and reference month', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);

    const { result } = renderIncomeHook(() => useRegisterIncomePayment());
    result.current.mutate(septemberPayment);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    stub('POST', '/income/payment', 201, { ...paymentResponse, id: 'pay2', amountReceived: 800 });
    result.current.mutate({ ...septemberPayment, amountReceived: 800 });

    await waitFor(() => {
      expect(result.current.data?.id).toBe('pay2');
    });

    expect(callsTo('POST', '/income/payment')).toHaveLength(2);
  });
});

describe("changing a recurring source's value", () => {
  const versionResponse = {
    id: 'v2',
    incomeSourceId: 's1',
    amount: 5500,
    expectedDay: 6,
    validityStart: '2026-08-01',
    validityEnd: null,
    changeReason: 'Dissídio anual',
  };

  const change = {
    incomeSourceId: 's1',
    amount: 5500,
    expectedDay: 6,
    validityStart: '2026-08-01',
    changeReason: 'Dissídio anual',
  };

  // Spec INC AC7 names four values, and all four are pinned in one literal body (lesson L-003).
  it('sends the new amount, the new expected day, the validity start and the reason', async () => {
    stub('PUT', '/income/value', 200, versionResponse);

    const { result } = renderIncomeHook(() => useChangeIncomeValue());
    result.current.mutate(change);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('PUT', '/income/value')).toBe(
      '{"incomeSourceId":"s1","amount":5500,"expectedDay":6,"validityStart":"2026-08-01","changeReason":"Dissídio anual"}'
    );
  });

  it('refreshes the month the new value starts in', async () => {
    stub('GET', '/income/2026/8', 200, august([salaryLine], 0));
    stub('PUT', '/income/value', 200, versionResponse);

    const { result } = renderIncomeHook(() => ({
      month: useIncomeMonth(2026, 8),
      change: useChangeIncomeValue(),
    }));

    await waitFor(() => {
      expect(result.current.month.data?.lines[0]?.expectedAmount).toBe(5000);
    });

    stub('GET', '/income/2026/8', 200, august([{ ...salaryLine, expectedAmount: 5500 }], 0));
    result.current.change.mutate(change);

    await waitFor(() => {
      expect(result.current.month.data?.lines[0]?.expectedAmount).toBe(5500);
    });
  });
});
