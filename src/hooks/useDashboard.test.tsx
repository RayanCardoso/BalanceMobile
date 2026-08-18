import { renderHook, waitFor } from '@testing-library/react-native';

import { useDashboard, useDashboardSeries } from '@/hooks/useDashboard';
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

let client = createTestQueryClient();

const renderDashboardHook = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: createQueryWrapper(client) });

/** One month as the API composes it: the income half, the expense half and the balance between. */
const dashboardBody = (competenceMonth: string, totalReceived: number, balance: number) => ({
  competenceMonth,
  income: {
    referenceMonth: competenceMonth,
    totalExpected: 5000,
    totalReceived,
    lines: [],
  },
  expenses: {
    competenceMonth,
    variableLines: [],
    recurringLines: [],
    totalVariable: 320.5,
    totalRecurringExpected: 150,
    totalRecurringPaid: 0,
    totalCommitted: 470.5,
  },
  balance,
});

const august = dashboardBody('2026-08-01', 4800, 4329.5);
const september = dashboardBody('2026-09-01', 0, -470.5);

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
  client.getQueryCache().getAll().forEach((query) => {
    query.destroy();
  });
  client.clear();
});

describe('reading a month of the dashboard (spec DASH AC1)', () => {
  it('requests the year and the month it was given', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);

    const { result } = renderDashboardHook(() => useDashboard(2026, 8));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(callsTo('GET', '/dashboard/2026/8')).toHaveLength(1);
    expect(result.current.data).toEqual(august);
  });

  /**
   * The month has to reach the key as well as the path. Sharing one entry across months is how a
   * screen shows August's figures under September's heading, and how a write invalidating one month
   * would appear to refresh every other one.
   */
  it('registers each month under its own dashboard key', async () => {
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);

    const { result } = renderDashboardHook(() => ({
      august: useDashboard(2026, 8),
      september: useDashboard(2026, 9),
    }));

    await waitFor(() => {
      expect(result.current.august.isSuccess).toBe(true);
      expect(result.current.september.isSuccess).toBe(true);
    });

    expect(client.getQueryData(qk.dashboard(2026, 8))).toEqual(august);
    expect(client.getQueryData(qk.dashboard(2026, 9))).toEqual(september);
  });
});

/**
 * The trend line under the month navigator. What belongs to the dashboard here is only *which*
 * number is the value of a month - the window and the reading are `useMonthSeries`'.
 *
 * `balance` is the API's own subtraction (MAD-001) and it arrives signed, so a month the user owes
 * money in plots below the others rather than as a positive spike.
 */
describe('the dashboard series (the balance of each month)', () => {
  it('reads the five months around the one it was given and plots their balance', async () => {
    stub('GET', '/dashboard/2026/6', 200, dashboardBody('2026-06-01', 5000, 1000));
    stub('GET', '/dashboard/2026/7', 200, dashboardBody('2026-07-01', 5000, 2000));
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);
    stub('GET', '/dashboard/2026/10', 200, dashboardBody('2026-10-01', 5000, 3000));

    const { result } = renderDashboardHook(() => useDashboardSeries(2026, 8));

    await waitFor(() => {
      expect(result.current.every((entry) => entry.value !== null)).toBe(true);
    });

    expect(result.current).toEqual([
      { year: 2026, month: 6, value: 1000 },
      { year: 2026, month: 7, value: 2000 },
      { year: 2026, month: 8, value: 4329.5 },
      { year: 2026, month: 9, value: -470.5 },
      { year: 2026, month: 10, value: 3000 },
    ]);
  });

  /** The centre month is the screen's own query, not a second request against the same route. */
  it('shares the centre month with the screen instead of requesting it twice', async () => {
    stub('GET', '/dashboard/2026/6', 200, dashboardBody('2026-06-01', 5000, 1000));
    stub('GET', '/dashboard/2026/7', 200, dashboardBody('2026-07-01', 5000, 2000));
    stub('GET', '/dashboard/2026/8', 200, august);
    stub('GET', '/dashboard/2026/9', 200, september);
    stub('GET', '/dashboard/2026/10', 200, dashboardBody('2026-10-01', 5000, 3000));

    const { result } = renderDashboardHook(() => ({
      month: useDashboard(2026, 8),
      series: useDashboardSeries(2026, 8),
    }));

    await waitFor(() => {
      expect(result.current.month.isSuccess).toBe(true);
      expect(result.current.series[2]?.value).toBe(4329.5);
    });

    expect(callsTo('GET', '/dashboard/2026/8')).toHaveLength(1);
  });
});
