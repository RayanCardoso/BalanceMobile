import { useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useExpenseMonth } from '@/hooks/useExpenses';
import {
  useArchiveRecurringExpense,
  useChangeRecurringValue,
  useRecurringExpenses,
  useRegisterRecurringExpense,
  useRegisterRecurringPayment,
  useUpdateRecurringPayment,
} from '@/hooks/useRecurring';
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

const renderRecurringHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

const monthBody = (competenceMonth: string, recurringLines: unknown[]) => ({
  competenceMonth,
  variableLines: [],
  recurringLines,
  totalVariable: 0,
  totalRecurringExpected: 150,
  totalRecurringPaid: 0,
  totalCommitted: 150,
});

/** An estimated bill that has not arrived: `actualAmount` and `paymentId` are both null. */
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

const registerInput = {
  name: 'Energia',
  personId: 'p1',
  categoryId: 'c2',
  accountId: 'a1',
  dueDay: 10,
  amount: 150,
  isEstimate: true,
};

/** The API answers with the bill and the single version it created, starting in August. */
const registeredBill = {
  id: 'r1',
  name: 'Energia',
  personId: 'p1',
  categoryId: 'c2',
  accountId: 'a1',
  dueDay: 10,
  isEstimate: true,
  archived: false,
  versions: [
    {
      id: 'v1',
      recurringExpenseId: 'r1',
      amount: 150,
      validityStart: '2026-08-01',
      validityEnd: null,
      changeReason: '',
    },
  ],
};

/**
 * August's bill, settled on **3 September**. The two dates differ on purpose: the month to refresh
 * is the reference one, and a hook keyed on the payment date would refresh September instead.
 */
const paymentInput = {
  recurringExpenseId: 'r1',
  referenceMonth: '2026-08-01',
  paymentDate: '2026-09-03',
  amountPaid: 187.4,
  notes: 'Conta veio mais alta',
  accountId: 'a1',
};

const recordedPayment = {
  id: 'pay-7',
  recurringExpenseId: 'r1',
  recurringExpenseVersionId: 'v1',
  referenceMonth: '2026-08-01',
  paymentDate: '2026-09-03',
  amountPaid: 187.4,
  notes: 'Conta veio mais alta',
  accountId: 'a1',
};

const correctionInput = {
  paymentId: 'pay-7',
  paymentDate: '2026-09-04',
  amountPaid: 190.2,
  notes: 'Valor corrigido',
  accountId: 'a2',
};

/** A re-price starting in **September**: August was priced under the old version and stays put. */
const changeInput = {
  recurringExpenseId: 'r1',
  amount: 180,
  validityStart: '2026-09-01',
  changeReason: 'Reajuste anual',
};

const repricedBill = {
  ...registeredBill,
  versions: [
    { ...registeredBill.versions[0], validityEnd: '2026-08-31' },
    {
      id: 'v2',
      recurringExpenseId: 'r1',
      amount: 180,
      validityStart: '2026-09-01',
      validityEnd: null,
      changeReason: 'Reajuste anual',
    },
  ],
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

/** July, August and September held in the cache, so which of them re-reads is observable. */
const renderThreeMonths = <T,>(hook: () => T) =>
  renderRecurringHook(() => ({
    july: useExpenseMonth(2026, 7),
    august: useExpenseMonth(2026, 8),
    september: useExpenseMonth(2026, 9),
    subject: hook(),
  }));

const stubThreeMonths = (): void => {
  stub('GET', '/expense/2026/7', 200, monthBody('2026-07-01', []));
  stub('GET', '/expense/2026/8', 200, monthBody('2026-08-01', [energyLine]));
  stub('GET', '/expense/2026/9', 200, monthBody('2026-09-01', [energyLine]));
};

describe('listing recurring bills (spec REC-01, T51)', () => {
  it('reads the recurringExpenses array of GET /api/recurring-expense', async () => {
    stub('GET', '/recurring-expense', 200, { recurringExpenses: [registeredBill] });

    const { result } = renderRecurringHook(() => useRecurringExpenses());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([registeredBill]);
  });
});

describe('registering a recurring bill (spec REC AC1)', () => {
  it('sends the name, the person, the category, the account, the due day, the amount and the estimate flag', async () => {
    stub('POST', '/recurring-expense', 201, registeredBill);

    const { result } = renderRecurringHook(() => useRegisterRecurringExpense());
    result.current.mutate(registerInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // A literal string, so a renamed or reordered field cannot agree with itself (lesson L-010).
    expect(bodySentTo('POST', '/recurring-expense')).toBe(
      '{"name":"Energia","personId":"p1","categoryId":"c2","accountId":"a1","dueDay":10,"amount":150,"isEstimate":true}'
    );
  });

  /**
   * The bill exists from its first version's validity start onward. July never showed it and still
   * does not, so re-reading July would be work for a month that cannot have changed.
   */
  it("refreshes every month from the version's validity start onward, and no earlier month", async () => {
    stubThreeMonths();
    stub('POST', '/recurring-expense', 201, registeredBill);

    const { result } = renderThreeMonths(() => useRegisterRecurringExpense());

    await waitFor(() => {
      expect(result.current.july.isSuccess).toBe(true);
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.subject.mutate(registerInput);

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/9')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/8')).toHaveLength(2);
    expect(callsTo('GET', '/expense/2026/7')).toHaveLength(1);
  });

  it('refreshes the dashboards of those same months and no earlier one', async () => {
    stub('POST', '/recurring-expense', 201, registeredBill);

    const dashboards = {
      july: jest.fn(async () => ({ totalCommitted: 0 })),
      august: jest.fn(async () => ({ totalCommitted: 0 })),
      september: jest.fn(async () => ({ totalCommitted: 0 })),
    };

    const { result } = renderRecurringHook(() => ({
      july: useQuery({ queryKey: qk.dashboard(2026, 7), queryFn: dashboards.july }),
      august: useQuery({ queryKey: qk.dashboard(2026, 8), queryFn: dashboards.august }),
      september: useQuery({ queryKey: qk.dashboard(2026, 9), queryFn: dashboards.september }),
      register: useRegisterRecurringExpense(),
    }));

    await waitFor(() => {
      expect(result.current.july.isSuccess).toBe(true);
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.register.mutate(registerInput);

    await waitFor(() => {
      expect(dashboards.september).toHaveBeenCalledTimes(2);
    });

    expect(dashboards.august).toHaveBeenCalledTimes(2);
    expect(dashboards.july).toHaveBeenCalledTimes(1);
  });

  /** A newly registered bill has to appear in T37's list without a manual reload. */
  it('refreshes the recurring bills list', async () => {
    stub('GET', '/recurring-expense', 200, { recurringExpenses: [] });
    stub('POST', '/recurring-expense', 201, registeredBill);

    const { result } = renderRecurringHook(() => ({
      list: useRecurringExpenses(),
      register: useRegisterRecurringExpense(),
    }));

    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    result.current.register.mutate(registerInput);

    await waitFor(() => {
      expect(callsTo('GET', '/recurring-expense')).toHaveLength(2);
    });
  });
});

describe('recording what a bill cost in a month (spec REC AC3)', () => {
  it('sends the reference month, the payment date, the amount paid, the notes and the paying account', async () => {
    stub('POST', '/recurring-expense/payment', 201, recordedPayment);

    const { result } = renderRecurringHook(() => useRegisterRecurringPayment());
    result.current.mutate(paymentInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('POST', '/recurring-expense/payment')).toBe(
      '{"recurringExpenseId":"r1","referenceMonth":"2026-08-01","paymentDate":"2026-09-03","amountPaid":187.4,"notes":"Conta veio mais alta","accountId":"a1"}'
    );
  });

  /**
   * MAD-003: the month refreshed is the payment's own reference month. The bill belongs to August
   * and was settled on 3 September; refreshing September would re-read a month the payment is not in
   * and leave August showing the estimate it has just replaced.
   */
  it('refreshes the month the payment refers to and not the month it was paid in', async () => {
    stubThreeMonths();
    stub('POST', '/recurring-expense/payment', 201, recordedPayment);

    const { result } = renderThreeMonths(() => useRegisterRecurringPayment());

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.subject.mutate(paymentInput);

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/8')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/9')).toHaveLength(1);
  });

  it("refreshes the referred month's dashboard and not the payment month's", async () => {
    stub('POST', '/recurring-expense/payment', 201, recordedPayment);

    const august = jest.fn(async () => ({ totalCommitted: 150 }));
    const september = jest.fn(async () => ({ totalCommitted: 0 }));

    const { result } = renderRecurringHook(() => ({
      august: useQuery({ queryKey: qk.dashboard(2026, 8), queryFn: august }),
      september: useQuery({ queryKey: qk.dashboard(2026, 9), queryFn: september }),
      record: useRegisterRecurringPayment(),
    }));

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.record.mutate(paymentInput);

    await waitFor(() => {
      expect(august).toHaveBeenCalledTimes(2);
    });

    expect(september).toHaveBeenCalledTimes(1);
  });
});

describe('correcting a recorded payment (spec REC AC5)', () => {
  it('addresses the payment by its own id and sends no second payment', async () => {
    stub('PUT', '/recurring-expense/payment/pay-7', 200, recordedPayment);

    const { result } = renderRecurringHook(() => useUpdateRecurringPayment());
    result.current.mutate(correctionInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(callsTo('PUT', '/recurring-expense/payment/pay-7')).toHaveLength(1);
    // Spec REC AC4: a correction replaces the recorded payment rather than adding another.
    expect(callsTo('POST', '/recurring-expense/payment')).toHaveLength(0);
  });

  it('sends only the amount, the payment date, the notes and the paying account', async () => {
    stub('PUT', '/recurring-expense/payment/pay-7', 200, recordedPayment);

    const { result } = renderRecurringHook(() => useUpdateRecurringPayment());
    result.current.mutate(correctionInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('PUT', '/recurring-expense/payment/pay-7')).toBe(
      '{"paymentDate":"2026-09-04","amountPaid":190.2,"notes":"Valor corrigido","accountId":"a2"}'
    );

    // A correction never moves which month the payment belongs to, nor which version it was measured
    // against, nor which bill it is. Absent, not null: the API's request carries no such fields.
    const payload = JSON.parse(bodySentTo('PUT', '/recurring-expense/payment/pay-7')!) as Record<
      string,
      unknown
    >;
    expect('referenceMonth' in payload).toBe(false);
    expect('recurringExpenseId' in payload).toBe(false);
    expect('paymentId' in payload).toBe(false);
  });

  it('refreshes the month the corrected payment belongs to, not the month it was corrected in', async () => {
    stubThreeMonths();
    stub('PUT', '/recurring-expense/payment/pay-7', 200, recordedPayment);

    const { result } = renderThreeMonths(() => useUpdateRecurringPayment());

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.subject.mutate(correctionInput);

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/8')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/9')).toHaveLength(1);
  });
});

describe('changing the base value (spec REC AC6)', () => {
  it('sends the bill, the new amount, the validity start and the change reason', async () => {
    stub('PUT', '/recurring-expense/value', 200, repricedBill);

    const { result } = renderRecurringHook(() => useChangeRecurringValue());
    result.current.mutate(changeInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(bodySentTo('PUT', '/recurring-expense/value')).toBe(
      '{"recurringExpenseId":"r1","amount":180,"validityStart":"2026-09-01","changeReason":"Reajuste anual"}'
    );
  });

  /**
   * "Past months unaffected" is a statement about the cache too. August was priced under the version
   * this change closed, so its figures are still right and it must not re-read; September onward
   * carry the new amount and must.
   */
  it('refreshes every month from the new validity start onward and leaves earlier months alone', async () => {
    stubThreeMonths();
    stub('PUT', '/recurring-expense/value', 200, repricedBill);

    const { result } = renderThreeMonths(() => useChangeRecurringValue());

    await waitFor(() => {
      expect(result.current.july.isSuccess).toBe(true);
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    result.current.subject.mutate(changeInput);

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/9')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/8')).toHaveLength(1);
    expect(callsTo('GET', '/expense/2026/7')).toHaveLength(1);
  });
});

describe('archiving and unarchiving (spec REC AC7, AC8)', () => {
  it("archives through the bill's own route", async () => {
    stub('PUT', '/recurring-expense/r1/archive?archived=true', 204, null);

    const { result } = renderRecurringHook(() => useArchiveRecurringExpense());
    result.current.mutate({ recurringExpenseId: 'r1', archived: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=true')).toHaveLength(1);
  });

  it('unarchives through the same route with the flag reversed', async () => {
    stub('PUT', '/recurring-expense/r1/archive?archived=false', 204, null);

    const { result } = renderRecurringHook(() => useArchiveRecurringExpense());
    result.current.mutate({ recurringExpenseId: 'r1', archived: false });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=false')).toHaveLength(1);
  });

  /**
   * The one write whose scope is the whole timeline. An archived bill disappears from every month at
   * once, including months already read and scrolled past, so July has to re-read here where the
   * three writes above deliberately leave it alone.
   */
  it('refreshes every month the app has cached, past and future alike', async () => {
    stubThreeMonths();
    stub('PUT', '/recurring-expense/r1/archive?archived=true', 204, null);

    const julyDashboard = jest.fn(async () => ({ totalCommitted: 150 }));

    const { result } = renderRecurringHook(() => ({
      july: useExpenseMonth(2026, 7),
      august: useExpenseMonth(2026, 8),
      september: useExpenseMonth(2026, 9),
      julyDashboard: useQuery({ queryKey: qk.dashboard(2026, 7), queryFn: julyDashboard }),
      archive: useArchiveRecurringExpense(),
    }));

    await waitFor(() => {
      expect(result.current.july.isSuccess).toBe(true);
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
      expect(result.current.julyDashboard.isSuccess).toBe(true);
    });

    result.current.archive.mutate({ recurringExpenseId: 'r1', archived: true });

    await waitFor(() => {
      expect(callsTo('GET', '/expense/2026/7')).toHaveLength(2);
    });

    expect(callsTo('GET', '/expense/2026/8')).toHaveLength(2);
    expect(callsTo('GET', '/expense/2026/9')).toHaveLength(2);
    expect(julyDashboard).toHaveBeenCalledTimes(2);
  });

  /** The list itself carries the flag this toggle just flipped, so T37 needs a fresh read too. */
  it('refreshes the recurring bills list', async () => {
    stub('GET', '/recurring-expense', 200, { recurringExpenses: [registeredBill] });
    stub('PUT', '/recurring-expense/r1/archive?archived=true', 204, null);

    const { result } = renderRecurringHook(() => ({
      list: useRecurringExpenses(),
      archive: useArchiveRecurringExpense(),
    }));

    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    result.current.archive.mutate({ recurringExpenseId: 'r1', archived: true });

    await waitFor(() => {
      expect(callsTo('GET', '/recurring-expense')).toHaveLength(2);
    });
  });
});
