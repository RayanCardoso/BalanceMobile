import type { MonthlyDashboard } from '@/types/dashboard';
import type { IncomeType } from '@/types/income';

/**
 * **A única exceção do app ao MAD-001**, e o único lugar que soma dinheiro no cliente.
 *
 * Por que ela existe: a API publica receita prevista e recebida, mas do lado da despesa publica só as
 * parcelas (`totalVariable`, `totalRecurringExpected`, `totalRecurringPaid`) e o `totalCommitted`,
 * que já mistura pago com estimado. E `balance` é `totalReceived - totalCommitted`, ou seja, só existe
 * saldo **real**. Não há despesa prevista nem saldo previsto na resposta, e o backend não muda.
 *
 * Por que ela está isolada aqui: concentrar a exceção num arquivo puro e testado é o que torna a sua
 * remoção uma deleção em vez de uma caçada. **Se a API passar a publicar despesa prevista e saldo
 * previsto, apague este módulo** e volte a imprimir campo por campo na tela.
 *
 * O que ela não faz: recalcular o saldo real. Esse continua sendo o `balance` que o servidor assinou,
 * com o sinal que veio (spec DASH AC5).
 */

export type Pair = { expected: number; actual: number };

export type Group = { count: number; total: number };

/** Os dois campos que a API já publica, lado a lado. Nada é somado aqui. */
export function incomePair(data: MonthlyDashboard): Pair {
  return { expected: data.income.totalExpected, actual: data.income.totalReceived };
}

/**
 * A despesa variável entra dos dois lados: uma compra lançada é, ao mesmo tempo, o que se esperava
 * gastar e o que se gastou. É a recorrente que se desdobra — estimada de um lado, paga do outro.
 */
export function expensePair(data: MonthlyDashboard): Pair {
  const { totalVariable, totalRecurringExpected, totalRecurringPaid } = data.expenses;

  return {
    expected: totalVariable + totalRecurringExpected,
    actual: totalVariable + totalRecurringPaid,
  };
}

export function balancePair(data: MonthlyDashboard): Pair {
  const income = incomePair(data);
  const expense = expensePair(data);

  return { expected: income.expected - expense.expected, actual: data.balance };
}

/** Uma das duas partições de receita. `type` é o campo que a própria linha carrega. */
export function incomeGroup(data: MonthlyDashboard, type: IncomeType): Group {
  const lines = data.income.lines.filter((line) => line.type === type);

  return {
    count: lines.length,
    total: lines.reduce((sum, line) => sum + line.receivedAmount, 0),
  };
}

export function variableExpenseGroup(data: MonthlyDashboard): Group {
  return { count: data.expenses.variableLines.length, total: data.expenses.totalVariable };
}

export function recurringExpenseGroup(data: MonthlyDashboard): Group {
  return { count: data.expenses.recurringLines.length, total: data.expenses.totalRecurringPaid };
}

/**
 * Quanto da barra encher, de 0 a 1, ou null quando não há proporção a mostrar.
 *
 * Null e não zero: um mês sem nada previsto não tem 0% de nada — não tem razão nenhuma, e uma barra
 * vazia mentiria dizendo "previa-se algo e nada aconteceu". A tela omite a barra quando isto é null.
 */
export function progress(pair: Pair): number | null {
  if (pair.expected <= 0) {
    return null;
  }

  return Math.min(Math.max(pair.actual / pair.expected, 0), 1);
}
