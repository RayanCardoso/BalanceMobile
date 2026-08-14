import { renderHook, waitFor } from '@testing-library/react-native';

import { useDashboard } from '@/features/dashboard/api/useDashboard';
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
