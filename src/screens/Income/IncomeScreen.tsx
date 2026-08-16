import { useState } from 'react';
import { Text, View } from 'react-native';

import { useIncomeMonth } from '@/hooks/useIncome';
import { INCOME_STATUS_LABEL, type IncomeStatus } from '@/types/income';
import { listErrorMessage } from '@/utils/errors/income';
import { currentMonth } from '@/utils/dates';
import { Money, StatusBadge, type StatusTone } from '@/components/Money';
import { MonthNavigator } from '@/components/MonthNavigator';
import { RegisterButton } from '@/components/RegisterButton';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';
import {CircleDollarSign, Wallet} from "lucide-react-native";
import { styles } from './IncomeScreen.styles';
import { colors } from '@/components/theme';

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

export function IncomeScreen(): React.JSX.Element {
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
      <MonthNavigator
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
        }}
        year={period.year}
      />

      <View style={styles.containerCardIncomeInformation}>
        <View style={styles.cardIncomeInformations}>
          <View style={styles.dollarIcon}>
            <CircleDollarSign color={colors.text.primary} />
          </View>
          <View style={styles.incomeInformations}>
            <Text  style={styles.textIncomeInformations}>Quantidade Total Prevista: XXXX,XX</Text>
            <Text  style={styles.textIncomeInformations}>Quantidade Total Recebida: XXXX,XX</Text>
          </View>
        </View>
        <RegisterButton href="/income/new" label='Nova receita' />
      </View>

      {renderLines()}
    </Screen>
  );
}
