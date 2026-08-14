import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RecurringBillsScreen } from '@/features/recurring/ui/RecurringBillsScreen';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Link = ({ href, children }: { href: string; children: ReactNode }) =>
    react.createElement(rn.Text, { testID: `link-${href}` }, children);

  return { Link };
});

const BASE = 'http://localhost:5126/api';

const fetchMock = jest.fn();

const stubs = new Map<string, { status: number; body: unknown }>();

const stub = (method: string, path: string, status: number, body: unknown): void => {
  stubs.set(`${method} ${BASE}${path}`, { status, body });
};

const bill = (
  id: string,
  name: string,
  dueDay: number,
  amount: number,
  isEstimate: boolean,
  archived: boolean
) => ({
  id,
  name,
  personId: 'p1',
  categoryId: 'c1',
  accountId: 'a1',
  dueDay,
  isEstimate,
  archived,
  versions: [
    {
      id: `${id}-v1`,
      recurringExpenseId: id,
      amount,
      validityStart: '2026-01-01',
      validityEnd: null,
      changeReason: '',
    },
  ],
});

let client = createTestQueryClient();

const renderBills = (): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RecurringBillsScreen />
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

describe('the four states of the recurring bills list', () => {
  it('shows a loading indicator while the first read is in flight', async () => {
    stub('GET', '/recurring-expense', 200, {
      recurringExpenses: [bill('r1', 'Aluguel', 10, 2250, false, false)],
    });
    renderBills();

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });
  });

  it('explains the empty list rather than showing a blank screen', async () => {
    stub('GET', '/recurring-expense', 200, { recurringExpenses: [] });
    renderBills();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Nenhuma conta recorrente cadastrada. Contas fixas como aluguel e luz aparecem aqui.'
        )
      ).toBeTruthy();
    });
  });

  it('offers a retry when the read fails, and shows the list once it works', async () => {
    stub('GET', '/recurring-expense', 500, {});
    renderBills();

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar as contas recorrentes.')).toBeTruthy();
    });

    stub('GET', '/recurring-expense', 200, {
      recurringExpenses: [bill('r1', 'Aluguel', 10, 2250, false, false)],
    });
    fireEvent.press(screen.getByText('Tentar novamente'));

    await waitFor(() => {
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });
  });
});

describe('what each row shows (spec REC-01, REC-02, lesson L-004)', () => {
  it('reports the due day, the current amount and the estimate flag', async () => {
    stub('GET', '/recurring-expense', 200, {
      recurringExpenses: [
        bill('r1', 'Luz', 15, 220, true, false),
        bill('r2', 'Netflix', 22, 44.9, false, false),
      ],
    });
    renderBills();

    await waitFor(() => {
      expect(screen.getByText('Luz')).toBeTruthy();
    });

    const list = within(screen.getByTestId('recurring-list'));

    expect(list.getByText('vence dia 15')).toBeTruthy();
    expect(list.getByText('R$ 220,00 (estimativa)')).toBeTruthy();

    expect(list.getByText('vence dia 22')).toBeTruthy();
    expect(list.getByText('R$ 44,90')).toBeTruthy();
  });

  // Spec REC-01/REC-04, T51. Without the list-all endpoint an archived bill would never render here
  // at all - this asserts both that it is visible and that it is labelled, not one or the other.
  it('marks an archived bill distinctly from an active one', async () => {
    stub('GET', '/recurring-expense', 200, {
      recurringExpenses: [
        bill('r1', 'Academia', 5, 149, false, true),
        bill('r2', 'Aluguel', 10, 2250, false, false),
      ],
    });
    renderBills();

    await waitFor(() => {
      expect(screen.getByText('Academia')).toBeTruthy();
    });

    const list = within(screen.getByTestId('recurring-list'));

    expect(list.getByText('Arquivada')).toBeTruthy();
    expect(list.queryAllByText('Arquivada')).toHaveLength(1);
  });
});

describe('navigation to registration', () => {
  it('links to the new-bill route', async () => {
    stub('GET', '/recurring-expense', 200, { recurringExpenses: [] });
    renderBills();

    expect(screen.getByTestId('link-/recurring/new')).toBeTruthy();
  });
});
