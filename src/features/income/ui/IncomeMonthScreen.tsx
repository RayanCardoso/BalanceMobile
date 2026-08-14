import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useIncomeMonth } from '@/features/income/api/useIncome';
import { INCOME_STATUS_LABEL, type IncomeStatus } from '@/features/income/model/income';
import { listErrorMessage } from '@/features/income/ui/errors';
import { currentMonth } from '@/shared/lib/dates';
import { Money, StatusBadge, type StatusTone } from '@/shared/ui/Money';
import { MonthNavigator } from '@/shared/ui/MonthNavigator';
import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';
import { colors, radius, space, type } from '@/shared/ui/theme';

/**
 * Spec INC AC1 and AC2 - one line per source carrying its expected amount, its received amount and
 * its status.
 *
 * A Variable source has no version, so the API sends `expectedAmount: null`. It renders as an em
 * dash, never as `R$ 0,00`: null says nothing is expected, zero says nothing was expected to arrive,
 * and a reader cannot tell a variable source from an unpaid one if the two look the same.
 */

/** Colour is a second signal beside the label, which is what the criterion actually names. */
const STATUS_TONE: Record<IncomeStatus, StatusTone> = {
  0: 'neutral',
  1: 'positive',
  2: 'warning',
};

export function IncomeMonthScreen(): React.JSX.Element {
  const [period, setPeriod] = useState(() => currentMonth());

  const month = useIncomeMonth(period.year, period.month);

  const renderLines = (): React.JSX.Element => {
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

    if (month.data.lines.length === 0) {
      return (
        <EmptyState message="Nenhuma receita neste mês. Cadastre uma fonte de renda para acompanhá-la aqui." />
      );
    }

    return (
      <View style={styles.list} testID="income-line-list">
        {month.data.lines.map((line) => (
          <View
            key={line.incomeSourceId}
            style={styles.row}
            testID={`income-line-${line.incomeSourceId}`}
          >
            <Text style={styles.rowName}>{line.name}</Text>

            <View style={styles.figure}>
              <Text style={styles.figureLabel}>Previsto</Text>
              <View testID={`income-expected-${line.incomeSourceId}`}>
                {line.expectedAmount === null ? (
                  <Text style={styles.absent}>—</Text>
                ) : (
                  <Money value={line.expectedAmount} />
                )}
              </View>
            </View>

            <View style={styles.figure}>
              <Text style={styles.figureLabel}>Recebido</Text>
              <View testID={`income-received-${line.incomeSourceId}`}>
                <Money value={line.receivedAmount} />
              </View>
            </View>

            {/* `Recebido` is both a figure label here and the status 1 label. Each of the three
                fields the criterion names gets its own subtree so a test can tell them apart. */}
            <View testID={`income-status-${line.incomeSourceId}`}>
              <StatusBadge
                label={INCOME_STATUS_LABEL[line.status]}
                tone={STATUS_TONE[line.status]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Receitas</Text>

      <MonthNavigator
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
        }}
        year={period.year}
      />

      {renderLines()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text.primary,
  },
  list: {
    gap: space.sm,
    marginTop: space.sm,
  },
  row: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.xs,
    padding: space.md,
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  figure: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  figureLabel: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
  },
  absent: {
    ...type.body,
    color: colors.text.muted,
    fontSize: 16,
  },
});
