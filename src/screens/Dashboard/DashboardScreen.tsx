import { useState } from 'react';
import { Text, View } from 'react-native';

import { useDashboard, useDashboardSeries } from '@/hooks/useDashboard';
import type { MonthlyDashboard } from '@/types/dashboard';
import { listErrorMessage } from '@/utils/errors/dashboard';
import type { RecurringExpenseLine, VariableExpenseLine } from '@/types/expense';
import type { MonthlyIncomeLine } from '@/types/income';
import { currentMonth } from '@/utils/dates';
import { Money } from '@/components/Money';
import { MonthNavigator } from '@/components/MonthNavigator';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';

import { styles } from './DashboardScreen.styles';

/**
 * The app's landing screen: what came in, what the month costs and what is left (spec DASH AC1).
 *
 * Nothing is added up here. `totalReceived`, `totalCommitted` and `balance` are all the API's own
 * figures (MAD-001), and `balance` arrives already signed - a negative one is money owed and is
 * rendered with its sign, never as an absolute value (spec DASH AC5). The groups below carry no
 * subtotals for the same reason: the API publishes no per-group total, and computing one here would
 * be the client deciding what a group is worth.
 *
 * The four groups (spec DASH AC6) are a partition of two lists the API already returns: the income
 * lines split on the `type` each one carries, and the expense month's two arrays. No line is
 * classified by this screen - it only puts each where the field it arrived with says it goes.
 *
 * Each month is its own query key, so moving to another month has no data until that month answers
 * and the loading state shows instead of the previous month's figures (spec DASH AC3). A screen
 * keyed on one entry would leave August's totals on screen under September's heading.
 */

function LineRow({
  testID,
  name,
  value,
}: {
  testID: string;
  name: string;
  value: number | null;
}): React.JSX.Element {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.rowName}>{name}</Text>
      {value === null ? <Text style={styles.absent}>—</Text> : <Money value={value} />}
    </View>
  );
}

function Group({
  testID,
  title,
  empty,
  children,
}: {
  testID: string;
  title: string;
  empty: string;
  children: React.ReactNode[];
}): React.JSX.Element {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.list} testID={testID}>
        {children.length === 0 ? <Text style={styles.detail}>{empty}</Text> : children}
      </View>
    </View>
  );
}

function Totals({ data }: { data: MonthlyDashboard }): React.JSX.Element {
  return (
    <View style={styles.totals}>
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Recebido</Text>
        <View testID="dashboard-total-received">
          <Money value={data.income.totalReceived} />
        </View>
      </View>

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Comprometido</Text>
        <View testID="dashboard-total-committed">
          <Money value={data.expenses.totalCommitted} />
        </View>
      </View>

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Saldo</Text>
        <View testID="dashboard-balance">
          <Money value={data.balance} />
        </View>
      </View>
    </View>
  );
}

/** A recurring bill reads as what was paid once it arrived, and as what is expected until then. */
const recurringFigure = (line: RecurringExpenseLine): number | null =>
  line.actualAmount ?? line.expectedAmount;

const incomeOfType = (lines: MonthlyIncomeLine[], type: 0 | 1): MonthlyIncomeLine[] =>
  lines.filter((line) => line.type === type);

const incomeRow = (line: MonthlyIncomeLine): React.JSX.Element => (
  <LineRow
    key={line.incomeSourceId}
    name={line.name}
    testID={`dashboard-income-${line.incomeSourceId}`}
    value={line.receivedAmount}
  />
);

const variableExpenseRow = (line: VariableExpenseLine): React.JSX.Element => (
  <LineRow
    key={line.expenseId}
    name={line.name}
    testID={`dashboard-expense-${line.expenseId}`}
    value={line.amount}
  />
);

const recurringExpenseRow = (line: RecurringExpenseLine): React.JSX.Element => (
  <LineRow
    key={line.recurringExpenseId}
    name={line.name}
    testID={`dashboard-expense-${line.recurringExpenseId}`}
    value={recurringFigure(line)}
  />
);

export function DashboardScreen(): React.JSX.Element {
  const [period, setPeriod] = useState(() => currentMonth());

  const month = useDashboard(period.year, period.month);
  const series = useDashboardSeries(period.year, period.month);

  const renderMonth = (): React.JSX.Element => {
    if (month.isError) {
      // Spec DASH AC7.
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

    const { income, expenses } = month.data;
    const empty =
      income.lines.length === 0 &&
      expenses.variableLines.length === 0 &&
      expenses.recurringLines.length === 0;

    return (
      <View style={styles.sections}>
        {/* Spec DASH AC4: the totals are rendered for an empty month too, zeroed rather than gone. */}
        <Totals data={month.data} />

        {empty ? (
          <EmptyState message="Nenhum registro neste mês. Receitas, despesas e contas recorrentes aparecem aqui assim que forem lançadas." />
        ) : (
          <>
            <Group
              empty="Nenhuma receita recorrente neste mês."
              testID="group-recurring-income"
              title="Receitas recorrentes"
            >
              {incomeOfType(income.lines, 0).map(incomeRow)}
            </Group>

            <Group
              empty="Nenhuma receita variável neste mês."
              testID="group-variable-income"
              title="Receitas variáveis"
            >
              {incomeOfType(income.lines, 1).map(incomeRow)}
            </Group>

            <Group
              empty="Nenhuma conta recorrente neste mês."
              testID="group-recurring-expenses"
              title="Despesas recorrentes"
            >
              {expenses.recurringLines.map(recurringExpenseRow)}
            </Group>

            <Group
              empty="Nenhuma despesa variável neste mês."
              testID="group-variable-expenses"
              title="Despesas variáveis"
            >
              {expenses.variableLines.map(variableExpenseRow)}
            </Group>
          </>
        )}
      </View>
    );
  };

  return (
    <Screen>
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
