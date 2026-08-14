import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useExpenseMonth } from '@/features/expenses/api/useExpenses';
import { ArchiveToggle } from '@/features/recurring/ui/ArchiveToggle';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const BASE = 'http://localhost:5126/api';

const fetchMock = jest.fn();

const stubs = new Map<string, { status: number; body: unknown }[]>();

/** Queues a sequence of responses for one route, consumed in order - one per call. */
const stubSequence = (method: string, path: string, responses: { status: number; body: unknown }[]): void => {
  stubs.set(`${method} ${BASE}${path}`, [...responses]);
};

const callsTo = (method: string, path: string): unknown[][] =>
  fetchMock.mock.calls.filter(
    ([url, init]) => url === `${BASE}${path}` && (init as { method: string }).method === method
  );

let client = createTestQueryClient();

beforeEach(() => {
  jest.clearAllMocks();
  stubs.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init: { method: string }) => {
    const queue = stubs.get(`${init.method} ${url}`);
    const found = queue?.shift();

    if (found === undefined) {
      throw new Error(`no stub left for ${init.method} ${url}`);
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

describe('archiving an active bill (spec REC AC7) - confirms first', () => {
  it('does not archive on the first press, only after confirming', async () => {
    stubSequence('PUT', '/recurring-expense/r1/archive?archived=true', [{ status: 204, body: null }]);

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <ArchiveToggle archived={false} recurringExpenseId="r1" />
      </Wrapper>
    );

    fireEvent.press(screen.getByText('Arquivar'));

    expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=true')).toHaveLength(0);
    expect(screen.getByText('Arquivar esta conta?')).toBeTruthy();

    fireEvent.press(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=true')).toHaveLength(1);
    });
  });

  it('cancels without archiving', async () => {
    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <ArchiveToggle archived={false} recurringExpenseId="r1" />
      </Wrapper>
    );

    fireEvent.press(screen.getByText('Arquivar'));
    fireEvent.press(screen.getByText('Cancelar'));

    expect(screen.queryByText('Arquivar esta conta?')).toBeNull();
    expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=true')).toHaveLength(0);
    expect(screen.getByText('Arquivar')).toBeTruthy();
  });
});

describe('unarchiving (spec REC AC8) - no confirmation needed', () => {
  it('unarchives on a single press', async () => {
    stubSequence('PUT', '/recurring-expense/r1/archive?archived=false', [{ status: 204, body: null }]);

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <ArchiveToggle archived recurringExpenseId="r1" />
      </Wrapper>
    );

    expect(screen.getByText('Arquivada')).toBeTruthy();

    fireEvent.press(screen.getByText('Desarquivar'));

    await waitFor(() => {
      expect(callsTo('PUT', '/recurring-expense/r1/archive?archived=false')).toHaveLength(1);
    });
  });
});

/**
 * Spec REC AC7/AC8's real payoff: archiving is not deletion. A bill leaves the month, and unarchiving
 * brings it back showing the exact payment it had before - proven at the layer that actually carries a
 * payment (the monthly expense view; the bills list itself has no `actualAmount` field to check).
 *
 * `archived` here is driven by local state that flips on the mutation's own success, standing in for
 * what `RecurringBillsScreen` does in the real app when its list re-fetches with the new flag.
 */
function ArchiveAndWatchMonth(): React.JSX.Element {
  const [archived, setArchived] = useState(false);
  const month = useExpenseMonth(2026, 8);
  const line = month.data?.recurringLines.find((candidate) => candidate.recurringExpenseId === 'r1');

  return (
    <>
      <ArchiveToggle archived={archived} recurringExpenseId="r1" />
      <Pressable
        onPress={() => {
          setArchived((current) => !current);
        }}
        testID="flip-archived"
      >
        <Text>Alternar</Text>
      </Pressable>
      {line?.actualAmount === null || line?.actualAmount === undefined ? null : (
        <Text>Valor pago: {line.actualAmount}</Text>
      )}
    </>
  );
}

describe('the payment survives an archive/unarchive round trip', () => {
  it('shows the same paid amount after unarchiving that was there before archiving', async () => {
    const paidLine = {
      recurringExpenseId: 'r1',
      name: 'Academia',
      personId: 'p1',
      categoryId: 'c1',
      accountId: 'a1',
      dueDay: 5,
      isEstimate: false,
      expectedAmount: 149,
      actualAmount: 149,
      paymentDate: '2026-08-05',
      paymentId: 'pay1',
      notes: null,
      status: 1,
    };

    const monthWith = () => ({
      competenceMonth: '2026-08-01',
      variableLines: [],
      recurringLines: [paidLine],
      totalVariable: 0,
      totalRecurringExpected: 149,
      totalRecurringPaid: 149,
      totalCommitted: 149,
    });

    const monthWithout = () => ({
      competenceMonth: '2026-08-01',
      variableLines: [],
      recurringLines: [],
      totalVariable: 0,
      totalRecurringExpected: 0,
      totalRecurringPaid: 0,
      totalCommitted: 0,
    });

    // Read 1: before archiving. Read 2: archived, backend excludes it. Read 3: unarchived, back with
    // its recorded payment - the backend never forgot it, only stopped showing it.
    stubSequence('GET', '/expense/2026/8', [
      { status: 200, body: monthWith() },
      { status: 200, body: monthWithout() },
      { status: 200, body: monthWith() },
    ]);
    stubSequence('PUT', '/recurring-expense/r1/archive?archived=true', [{ status: 204, body: null }]);
    stubSequence('PUT', '/recurring-expense/r1/archive?archived=false', [{ status: 204, body: null }]);

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <ArchiveAndWatchMonth />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Valor pago: 149')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Arquivar'));
    fireEvent.press(screen.getByText('Confirmar'));

    // A longer timeout than the default 1000ms: this step is a mutate -> invalidate -> refetch ->
    // re-render chain, not a single request, and under the CPU contention of the full suite running
    // concurrently that chain can outrun the default window even though nothing is actually wrong.
    await waitFor(
      () => {
        expect(screen.queryByText('Valor pago: 149')).toBeNull();
      },
      { timeout: 5000 }
    );

    fireEvent.press(screen.getByTestId('flip-archived'));
    fireEvent.press(screen.getByText('Desarquivar'));

    await waitFor(
      () => {
        expect(screen.getByText('Valor pago: 149')).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});
