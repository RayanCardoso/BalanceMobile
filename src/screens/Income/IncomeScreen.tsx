import { useState } from 'react';
import { Text, View } from 'react-native';

import { useIncomeMonth, useIncomeMonthSeries } from '@/hooks/useIncome';
import { INCOME_STATUS_LABEL, type IncomeStatus, type MonthlyIncomeLine } from '@/types/income';
import { listErrorMessage } from '@/utils/errors/income';
import { currentMonth } from '@/utils/dates';
import { Money, StatusBadge, type StatusTone } from '@/components/Money';
import { MonthTrend } from '@/components/MonthTrend';
import { RecordIncomePaymentModal } from '@/components/RecordIncomePaymentModal';
import { RegisterButton } from '@/components/RegisterButton';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';
import {CircleDollarSign, EllipsisVertical, Wallet} from "lucide-react-native";
import { styles } from './IncomeScreen.styles';
import { colors } from '@/components/theme';
import { Menu, MenuTrigger, MenuOptions, MenuOption  } from "react-native-popup-menu";
import { router } from 'expo-router';

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

  /**
   * A linha cujo recebimento está sendo registrado, ou null com o modal fechado. Guardar a linha, e
   * não só o id, é o que permite o modal mostrar de quem é o recebimento sem consultar nada.
   */
  const [payingFor, setPayingFor] = useState<MonthlyIncomeLine | null>(null);

  const month = useIncomeMonth(period.year, period.month);
  const series = useIncomeMonthSeries(period.year, period.month);

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
            <View style={styles.rowHeader}>
              <Text style={styles.rowName}>{line.name}</Text>
              <Menu>
                <MenuTrigger>
                  <EllipsisVertical
                    size={20}
                    color={colors.text.primary}
                  />
                </MenuTrigger>

                <MenuOptions
                  customStyles={{
                    optionsContainer: {
                      backgroundColor: colors.surface.raised,
                      borderColor: colors.border.subtle,
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 4,
                      width: 220,
                    },
                    optionText: {
                      color: "#ffffff"
                    }
                  }}
                >
                  <MenuOption
                    onSelect={() => {
                      setPayingFor(line);
                    }}
                    text="Registrar recebimento"
                  />

                  <MenuOption
                    onSelect={() =>
                      router.push({
                        pathname: '/income/change-value',
                        params: {
                          incomeSourceId: line.incomeSourceId,
                        },
                      })
                    }
                    text="Alterar valor"
                  />
                </MenuOptions>
              </Menu>
            </View>
            <View style={styles.containerFigureAndLabel}>
              <View style={styles.containerFigure}>
                <View style={styles.figure}>
                  <Text style={styles.figureLabel}>Previsto</Text>
                  <View testID={`income-expected-${line.incomeSourceId}`}>
                    {line.expectedAmount === null ? (
                      <Text style={[styles.absent, styles.expectedAmountText]}>—</Text>
                    ) : (
                      <Money value={line.expectedAmount} style={styles.expectedAmountText} />
                    )}
                  </View>
                </View>

                <View style={styles.figure}>
                  <Text style={styles.figureLabel}>Recebido</Text>
                  <View testID={`income-received-${line.incomeSourceId}`}>
                    <Money value={line.receivedAmount} />
                  </View>
                </View>
              </View>
              
              <View testID={`income-status-${line.incomeSourceId}`}>
                <StatusBadge
                  label={INCOME_STATUS_LABEL[line.status]}
                  tone={STATUS_TONE[line.status]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <MonthTrend
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
        }}
        series={series}
        year={period.year}
      />

      <View style={styles.containerCardIncomeInformation}>
        <View style={styles.incomeHeader}>
          <View style={styles.dollarIcon}>
            <CircleDollarSign size={23} color={colors.text.primary} />
          </View>

          <Text style={styles.incomeTitle}>
            Resumo do mês
          </Text>
        </View>

        <View style={styles.incomeValues}>
          <View style={styles.incomeValue}>
            <Text style={styles.incomeLabel}>
              Total previsto
            </Text>

            <Text style={styles.incomeAmount}>
              R$ 4.675,00
            </Text>

            <Text style={styles.incomeQuantity}>
              3 receitas previstas
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.incomeValue}>
            <Text style={styles.incomeLabel}>
              Total recebido
            </Text>

            <Text style={styles.incomeAmount}>
              R$ 0,00
            </Text>

            <Text style={styles.incomeQuantity}>
              0 recebidas
            </Text>
          </View>
        </View>

        <View style={styles.containerRegisterButton}>
          <RegisterButton
            href="/income/new"
            label="Nova receita"
            style={styles.registerButton}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Receitas</Text>

      {renderLines()}

      <RecordIncomePaymentModal
        line={payingFor}
        onClose={() => {
          setPayingFor(null);
        }}
        period={period}
      />
    </Screen>
  );
}
