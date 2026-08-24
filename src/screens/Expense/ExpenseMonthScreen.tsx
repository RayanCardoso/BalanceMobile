import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { BarChart3, Repeat } from 'lucide-react-native';

import { PRIORITY_LABEL } from '@/types/priority';
import { useExpenseMonth, useExpenseMonthSeries } from '@/hooks/useExpenses';
import {
  EXPENSE_STATUS_LABEL,
  EXPENSE_TYPE_LABEL,
  type ExpenseStatus,
  type RecurringExpenseLine,
  type VariableExpenseLine,
} from '@/types/expense';
import { listErrorMessage } from '@/utils/errors/expenses';
import { currentMonth } from '@/utils/dates';
import { AddMenu, addOptionsFor } from '@/components/AddMenu';
import { Money, StatusBadge, type StatusTone } from '@/components/Money';
import { MonthNavigator } from '@/components/MonthNavigator';
import { RowMenu, type RowAction } from '@/components/RowMenu';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';
import { colors } from '@/components/theme';

import { styles } from './ExpenseMonthScreen.styles';

/**
 * Spec EXP AC1 - the month's variable expenses and its recurring bills as two separate groups.
 *
 * A recurring line shows what was actually paid once the bill has arrived, and the expected amount
 * until then. While that expected amount is an estimate and nothing has been paid, it is marked
 * provisional (spec REC AC2): the figure is a guess, and a reader who cannot tell a guess from a
 * known value is reading the month as more certain than it is. Once the bill is paid the mark goes,
 * because the number is then a fact.
 *
 * A bill with no version in effect for the month has no expected amount at all, and renders as an em
 * dash rather than R$ 0,00 (spec edge case) - the same distinction the income month draws for a
 * variable source.
 *
 * Nothing here adds anything up, and nothing here is a form. Lançar uma despesa é o botão flutuante,
 * que é o mesmo `AddMenu` do Resumo pedindo só o que é despesa; agir sobre uma linha que já existe é
 * o menu da própria linha. As duas coisas moram onde o usuário está olhando quando pensa nelas.
 */

/** Colour is a second signal beside the label, which is what the criterion actually names. */
const STATUS_TONE: Record<ExpenseStatus, StatusTone> = {
  0: 'neutral',
  1: 'positive',
  2: 'warning',
};

function VariableLine({ line }: { line: VariableExpenseLine }): React.JSX.Element {
  return (
    <View style={styles.row} testID={`variable-line-${line.expenseId}`}>
      <Text style={styles.rowName}>{line.name}</Text>

      <View style={styles.figure}>
        <Text style={styles.figureLabel} testID={`variable-type-${line.expenseId}`}>
          {EXPENSE_TYPE_LABEL[line.type]}
        </Text>
        <View testID={`variable-amount-${line.expenseId}`}>
          <Money value={line.amount} />
        </View>
      </View>

      <Text style={styles.detail} testID={`variable-category-${line.expenseId}`}>
        {line.categoryName} · {PRIORITY_LABEL[line.categoryPriority]}
      </Text>

      <Text style={styles.detail} testID={`variable-date-${line.expenseId}`}>
        {line.date} · {line.accountName}
      </Text>

      {/* Spec INST AC3: an installment shows its position out of the plan's total. */}
      {line.installmentNumber !== null && line.installmentCount !== null ? (
        <Text style={styles.detail} testID={`variable-installment-${line.expenseId}`}>
          Parcela {line.installmentNumber} de {line.installmentCount}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * O que o menu de uma conta recorrente oferece, que depende do que já aconteceu com ela neste mês.
 *
 * `paymentId` é o que separa os dois primeiros verbos, e é o mesmo campo que a tela de pagamento lê
 * para escolher entre POST e PUT (spec REC AC4): oferecer "Registrar pagamento" numa conta já paga
 * levaria a um `PAYMENT_ALREADY_RECORDED`, e oferecer "Corrigir pagamento" numa conta que não chegou
 * levaria a uma tela sem nada para corrigir. Alterar o valor base não depende do mês: é a linha do
 * tempo da conta, e vale a partir da vigência que a tela de lá pedir (spec REC AC6).
 */
const recurringActions = (
  line: RecurringExpenseLine,
  period: { year: number; month: number }
): RowAction[] => [
  {
    label: line.paymentId === null ? 'Registrar pagamento' : 'Corrigir pagamento',
    onSelect: () => {
      router.push({
        pathname: '/expenses/recurring/payment',
        params: {
          recurringExpenseId: line.recurringExpenseId,
          year: period.year,
          month: period.month,
        },
      });
    },
  },
  {
    label: 'Alterar valor',
    onSelect: () => {
      router.push({
        pathname: '/expenses/recurring/change-value',
        params: { recurringExpenseId: line.recurringExpenseId },
      });
    },
  },
];

function RecurringLine({
  line,
  period,
}: {
  line: RecurringExpenseLine;
  period: { year: number; month: number };
}): React.JSX.Element {
  // The bill has arrived when an actual amount exists; until then the expected one stands in, and
  // an estimated expected amount is provisional.
  const paid = line.actualAmount !== null;
  const provisional = !paid && line.isEstimate;
  // `??`, not `||`: an actual amount of zero is a paid bill, not an absent one.
  const shown = line.actualAmount ?? line.expectedAmount;

  return (
    <View style={styles.row} testID={`recurring-line-${line.recurringExpenseId}`}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowName}>{line.name}</Text>

        <RowMenu
          actions={recurringActions(line, period)}
          label={`Ações de ${line.name}`}
          testID={`recurring-menu-${line.recurringExpenseId}`}
        />
      </View>

      <View style={styles.figure}>
        <Text style={styles.figureLabel} testID={`recurring-dueday-${line.recurringExpenseId}`}>
          Vence dia {line.dueDay}
        </Text>
        <View testID={`recurring-amount-${line.recurringExpenseId}`}>
          {shown === null ? <Text style={styles.absent}>—</Text> : <Money value={shown} />}
        </View>
      </View>

      {provisional ? (
        <Text style={styles.provisional} testID={`recurring-provisional-${line.recurringExpenseId}`}>
          Valor provisório (estimativa)
        </Text>
      ) : null}

      <View testID={`recurring-status-${line.recurringExpenseId}`}>
        <StatusBadge label={EXPENSE_STATUS_LABEL[line.status]} tone={STATUS_TONE[line.status]} />
      </View>
    </View>
  );
}

export function ExpenseMonthScreen(): React.JSX.Element {
  const [period, setPeriod] = useState(() => currentMonth());

  const month = useExpenseMonth(period.year, period.month);
  const series = useExpenseMonthSeries(period.year, period.month);

  const renderMonth = (): React.JSX.Element => {
    if (month.isError) {
      return (
        <ErrorState
          message={listErrorMessage(month.error)}
          onRetry={() => {
            void month.refetch();
          }}
        />
      );
    }

    if (month.data === undefined) {
      return <Loading />;
    }

    const { variableLines, recurringLines } = month.data;

    if (variableLines.length === 0 && recurringLines.length === 0) {
      return (
        <EmptyState message="Nenhuma despesa neste mês. Registre uma compra ou cadastre uma conta recorrente para acompanhá-la aqui." />
      );
    }

    return (
      <View style={styles.sections}>
        <View style={styles.sectionContainer}>
          <BarChart3 size={16} color={colors.text.primary} />
          <View>
            <Text style={styles.sectionTitle}>Despesas variáveis</Text>
          </View>
        </View>

        <View style={styles.list} testID="variable-line-list">
          {variableLines.length === 0 ? (
            <Text style={styles.detail}>Nenhuma despesa variável neste mês.</Text>
          ) : (
            variableLines.map((line) => <VariableLine key={line.expenseId} line={line} />)
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Repeat size={16} color={colors.text.primary} />
          <View>
            <Text style={styles.sectionTitle}>Contas recorrentes</Text>
          </View>
        </View>

        <View style={styles.list} testID="recurring-line-list">
          {recurringLines.length === 0 ? (
            <Text style={styles.detail}>Nenhuma conta recorrente neste mês.</Text>
          ) : (
            recurringLines.map((line) => (
              <RecurringLine key={line.recurringExpenseId} line={line} period={period} />
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen floating={<AddMenu options={addOptionsFor('expense')} />}>
      <MonthNavigator
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
        }}
        series={series}
        year={period.year}
      />

      {renderMonth()}
    </Screen>
  );
}
