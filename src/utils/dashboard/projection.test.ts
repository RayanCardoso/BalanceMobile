import {
  balancePair,
  expensePair,
  incomeGroup,
  incomePair,
  progress,
  recurringExpenseGroup,
  variableExpenseGroup,
} from '@/utils/dashboard/projection';
import type { MonthlyDashboard } from '@/types/dashboard';

/**
 * Este módulo é a única exceção do app ao MAD-001. Os testes existem para que a exceção seja
 * verificável: cada figura é conferida contra a conta que a API faria se publicasse o campo.
 */

/** Uma fonte que paga o mesmo todo mês (`type: 0`), recebida a menos do que o previsto. */
const salary = {
  incomeSourceId: 'i1',
  name: 'Salário',
  type: 0 as const,
  personId: 'p1',
  expectedAmount: 5000,
  expectedDay: 5,
  receivedAmount: 4800,
  status: 2 as const,
};

/** Uma fonte sem versão, e portanto sem valor previsto (`type: 1`). */
const freelance = {
  incomeSourceId: 'i2',
  name: 'Freela',
  type: 1 as const,
  personId: 'p1',
  expectedAmount: null,
  expectedDay: null,
  receivedAmount: 1200,
  status: 1 as const,
};

const market = {
  expenseId: 'e1',
  name: 'Mercado',
  type: 1 as const,
  amount: 320.5,
  date: '2026-08-12',
  personId: 'p1',
  categoryId: 'c1',
  categoryName: 'Alimentação',
  categoryPriority: 0 as const,
  accountId: 'a1',
  accountName: 'Nubank',
  installmentNumber: null,
  installmentCount: null,
  installmentPlanId: null,
};

/** Uma conta estimada que ainda não chegou: o previsto existe, o pago não. */
const energy = {
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
  status: 0 as const,
};

const august: MonthlyDashboard = {
  competenceMonth: '2026-08-01',
  income: {
    referenceMonth: '2026-08-01',
    totalExpected: 5000,
    totalReceived: 6000,
    lines: [salary, freelance],
  },
  expenses: {
    competenceMonth: '2026-08-01',
    variableLines: [market],
    recurringLines: [energy],
    totalVariable: 320.5,
    totalRecurringExpected: 150,
    totalRecurringPaid: 0,
    totalCommitted: 470.5,
  },
  balance: 5529.5,
};

const empty: MonthlyDashboard = {
  competenceMonth: '2026-08-01',
  income: { referenceMonth: '2026-08-01', totalExpected: 0, totalReceived: 0, lines: [] },
  expenses: {
    competenceMonth: '2026-08-01',
    variableLines: [],
    recurringLines: [],
    totalVariable: 0,
    totalRecurringExpected: 0,
    totalRecurringPaid: 0,
    totalCommitted: 0,
  },
  balance: 0,
};

describe('receita prevista e recebida', () => {
  it('lê os dois campos que a API já publica, sem somar nada', () => {
    expect(incomePair(august)).toEqual({ expected: 5000, actual: 6000 });
  });
});

describe('despesa prevista e paga', () => {
  it('soma variáveis com recorrentes previstas para o previsto', () => {
    expect(expensePair(august).expected).toBe(470.5);
  });

  it('soma variáveis com recorrentes pagas para o real', () => {
    // A conta de energia não chegou: o mês custou até agora só o mercado.
    expect(expensePair(august).actual).toBe(320.5);
  });
});

describe('saldo', () => {
  it('prevê receita prevista menos despesa prevista', () => {
    expect(balancePair(august).expected).toBe(4529.5);
  });

  it('usa o saldo assinado da API como real, sem recalcular', () => {
    expect(balancePair(august).actual).toBe(5529.5);
  });

  it('devolve o saldo negativo com o sinal, nunca em valor absoluto', () => {
    // Spec DASH AC5: o sinal é o ponto.
    const owed: MonthlyDashboard = { ...august, balance: -470.5 };

    expect(balancePair(owed).actual).toBe(-470.5);
  });
});

describe('os quatro grupos', () => {
  it('parte as receitas pelo type que cada linha carrega', () => {
    expect(incomeGroup(august, 0)).toEqual({ count: 1, total: 4800 });
    expect(incomeGroup(august, 1)).toEqual({ count: 1, total: 1200 });
  });

  it('usa o total da API para a despesa variável', () => {
    expect(variableExpenseGroup(august)).toEqual({ count: 1, total: 320.5 });
  });

  it('usa o total pago da API para a despesa recorrente', () => {
    expect(recurringExpenseGroup(august)).toEqual({ count: 1, total: 0 });
  });
});

describe('a proporção da barra', () => {
  it('é o real sobre o previsto', () => {
    expect(progress({ expected: 200, actual: 50 })).toBe(0.25);
  });

  it('não passa de um quando o real superou o previsto', () => {
    expect(progress({ expected: 200, actual: 600 })).toBe(1);
  });

  it('não existe quando nada era previsto', () => {
    // Dividir por zero desenharia uma barra que não significa nada.
    expect(progress({ expected: 0, actual: 300 })).toBeNull();
  });

  it('não existe quando o previsto é negativo', () => {
    expect(progress({ expected: -100, actual: -20 })).toBeNull();
  });

  it('não desenha barra negativa quando o real ficou abaixo de zero', () => {
    expect(progress({ expected: 200, actual: -50 })).toBe(0);
  });
});

describe('um mês sem nada dentro', () => {
  it('zera todas as figuras em vez de sumir com elas', () => {
    // Spec DASH AC4.
    expect(incomePair(empty)).toEqual({ expected: 0, actual: 0 });
    expect(expensePair(empty)).toEqual({ expected: 0, actual: 0 });
    expect(balancePair(empty)).toEqual({ expected: 0, actual: 0 });
    expect(incomeGroup(empty, 0)).toEqual({ count: 0, total: 0 });
    expect(variableExpenseGroup(empty)).toEqual({ count: 0, total: 0 });
    expect(recurringExpenseGroup(empty)).toEqual({ count: 0, total: 0 });
  });
});
