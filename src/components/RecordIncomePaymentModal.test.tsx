import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RecordIncomePaymentModal } from '@/components/RecordIncomePaymentModal';
import { qk } from '@/services/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/services/testQueryClient';
import { useSessionStore } from '@/store/sessionStore';
import type { MonthlyIncomeLine } from '@/types/income';

jest.mock('@/utils/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * Hoje é 3 de setembro e o mês na tela é agosto. Os dois são deliberadamente diferentes: é
 * exatamente o caso que a spec INC AC5 existe para proteger — um salário pago em setembro que
 * pertence a agosto.
 */
jest.mock('@/utils/dates', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/dates'),
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

const payload = (): Record<string, unknown> =>
  JSON.parse(bodySentTo('POST', '/income/payment')!) as Record<string, unknown>;

const salary: MonthlyIncomeLine = {
  incomeSourceId: 's1',
  name: 'Salário',
  type: 0,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 0,
  status: 0,
};

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

const onClose = jest.fn();

const renderModal = (line: MonthlyIncomeLine | null = salary): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <RecordIncomePaymentModal line={line} onClose={onClose} period={{ year: 2026, month: 8 }} />
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

describe('quando o modal aparece', () => {
  /** `line` nulo é a forma fechada: nada é montado, e nenhuma consulta parte. */
  it('não mostra nada enquanto nenhuma fonte foi escolhida', () => {
    renderModal(null);

    expect(screen.queryByText('Registrar recebimento')).toBeNull();
  });

  /**
   * O modal já sabe de quem é o recebimento, porque a linha vem em mãos. Sem isso ele precisaria de
   * um seletor de fonte — que é o que a tela antiga tinha, e que ninguém precisava preencher duas
   * vezes.
   */
  it('mostra de qual fonte e de qual mês é o recebimento', () => {
    renderModal();

    expect(screen.getByText('Registrar recebimento')).toBeTruthy();
    // Fonte e mês numa linha só, que é como o cabeçalho do modal os apresenta.
    expect(screen.getByText('Salário · Agosto de 2026')).toBeTruthy();
  });

  it('abre com a data de hoje já preenchida, em formato brasileiro', () => {
    renderModal();

    expect(screen.getByText('03/09/2026')).toBeTruthy();
  });
});

/**
 * Spec INC AC5 — "send the reference month separately from the payment date".
 *
 * Os dois são asseridos, e asseridos como diferentes. Um formulário que reusasse a data do pagamento
 * como mês de referência passaria numa asserção sobre qualquer uma delas isoladamente, e moveria o
 * salário de agosto para setembro.
 */
describe('o mês de referência e a data do pagamento (spec INC AC5)', () => {
  it('envia um pagamento de 3 de setembro contra o mês de referência agosto', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);
    renderModal();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    expect(payload().paymentDate).toBe('2026-09-03');
    expect(payload().referenceMonth).toBe('2026-08-01');
    expect(payload().paymentDate).not.toBe(payload().referenceMonth);
  });

  it('envia a carga inteira como a API a declara', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);
    renderModal();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    // String literal, para que um campo renomeado ou reordenado não concorde consigo mesmo (L-010).
    expect(bodySentTo('POST', '/income/payment')).toBe(
      '{"incomeSourceId":"s1","paymentDate":"2026-09-03","referenceMonth":"2026-08-01","amountReceived":5000,"notes":null}'
    );
  });

  it('envia a data escolhida no calendário em vez da de hoje', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);
    renderModal();

    fireEvent.press(screen.getByLabelText('Data do pagamento, 03/09/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/income/payment')).toBeDefined();
    });

    // O substituto do picker devolve a data que recebeu, que é a que o campo já mostrava.
    expect(payload().paymentDate).toBe('2026-09-03');
    expect(payload().referenceMonth).toBe('2026-08-01');
  });
});

describe('depois de registrar', () => {
  /** Spec INC AC6: o mês se atualiza sozinho, sem recarga manual. */
  it('invalida o mês e fecha o modal', async () => {
    stub('POST', '/income/payment', 201, paymentResponse);
    client.setQueryData(qk.incomeMonth(2026, 8), { lines: [] });
    renderModal();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '5000,00');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  /** Um erro da API mantém o modal aberto: fechar apagaria o que o usuário digitou. */
  it('mostra a mensagem da API sem fechar', async () => {
    // MAD-004: a redação pt-BR do servidor chega intacta.
    stub('POST', '/income/payment', 400, { errorMessages: ['Valor recebido inválido.'] });
    renderModal();

    fireEvent.changeText(screen.getByLabelText('Valor recebido'), '0');
    fireEvent.press(screen.getByText('Registrar pagamento'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Valor recebido inválido.');
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('desistir', () => {
  it('fecha sem enviar nada', () => {
    renderModal();

    fireEvent.press(screen.getByLabelText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(bodySentTo('POST', '/income/payment')).toBeUndefined();
  });
});
