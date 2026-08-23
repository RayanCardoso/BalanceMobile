import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  CalendarClock,
  ChevronRight,
  Coins,
  Plus,
  Repeat,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react-native';

import { useAccounts, usePeople } from '@/hooks/useCatalogue';
import { useDashboard, useDashboardSeries } from '@/hooks/useDashboard';
import type { MonthlyDashboard } from '@/types/dashboard';
import { listErrorMessage } from '@/utils/errors/dashboard';
import { currentMonth } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import {
  balancePair,
  expensePair,
  incomeGroup,
  incomePair,
  progress,
  recurringExpenseGroup,
  variableExpenseGroup,
  type Group,
  type Pair,
} from '@/utils/dashboard/projection';
import { AccountCard } from '@/components/AccountCard';
import { Money } from '@/components/Money';
import { MonthTrend } from '@/components/MonthTrend';
import { QuickActions } from '@/components/QuickActions';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';
import { card, colors, space } from '@/components/theme';

import { styles } from './DashboardScreen.styles';

/**
 * A tela inicial: quanto o mês devia ser, quanto ele é, e de onde o dinheiro sai.
 *
 * Ela deixou de listar lançamento por lançamento. As telas de Receitas e Despesas já mostram cada
 * linha com status, menu e valor provisório — repetir os nomes aqui gastava a tela inteira com uma
 * cópia pior. O que sobrou é o que só esta tela responde: o par previsto × real de cada metade do
 * mês, e as quatro partições reduzidas a uma linha cada (spec DASH AC6), que leva à tela dona.
 *
 * `balance` continua vindo assinado da API e é renderizado com o sinal (spec DASH AC5). O previsto,
 * esse sim, é somado no cliente — ver `@/utils/dashboard/projection`, que documenta por que essa
 * exceção ao MAD-001 existe e quando apagá-la.
 *
 * Contas e pessoas são consultas laterais. Nenhuma das duas pode derrubar o mês: quando a de contas
 * falha o carrossel não aparece, quando a de pessoas falha o dono some do cartão, e o mês continua
 * na tela nos dois casos.
 */

/** A trilha só é desenhada quando existe proporção a mostrar — ver `progress`. */
function Bar({ pair, tone }: { pair: Pair; tone: string }): React.JSX.Element | null {
  const ratio = progress(pair);

  if (ratio === null) {
    return null;
  }

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: tone, width: `${ratio * 100}%` }]} />
    </View>
  );
}

function SummaryLine({
  label,
  pair,
  tone,
  expectedTestID,
  actualTestID,
  last = false,
}: {
  label: string;
  pair: Pair;
  tone: string;
  expectedTestID: string;
  actualTestID: string;
  /** O saldo: fecha o card com uma régua e não leva barra, porque os dois lados podem ser negativos. */
  last?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.line, last ? styles.balanceLine : null]}>
      <View style={styles.lineTop}>
        <Text style={styles.lineLabel}>{label}</Text>

        <View style={styles.figures}>
          <View testID={expectedTestID}>
            <Money style={styles.expected} value={pair.expected} />
          </View>
          <Text style={styles.arrow}>→</Text>
          <View testID={actualTestID}>
            <Money value={pair.actual} />
          </View>
        </View>
      </View>

      {last ? null : <Bar pair={pair} tone={tone} />}
    </View>
  );
}

function GroupRow({
  testID,
  href,
  name,
  group,
  icon: Icon,
  tone,
}: {
  testID: string;
  href: '/income' | '/expenses';
  name: string;
  group: Group;
  icon: LucideIcon;
  tone: string;
}): React.JSX.Element {
  const count = `${group.count} ${group.count === 1 ? 'lançamento' : 'lançamentos'}`;

  return (
    <Pressable
      // A linha inteira é um alvo só, então ela é anunciada como uma frase e não como três textos.
      accessibilityLabel={`${name}, ${count}, ${formatMoney(group.total)}`}
      accessibilityRole="button"
      onPress={() => {
        router.push(href);
      }}
      style={styles.group}
      testID={testID}
    >
      <Icon color={tone} size={18} />

      <View style={styles.groupText}>
        <Text style={styles.groupName}>{name}</Text>
        <Text style={styles.groupCount}>{count}</Text>
      </View>

      <Money value={group.total} />
      <ChevronRight color={colors.text.muted} size={16} />
    </Pressable>
  );
}

function Summary({ data }: { data: MonthlyDashboard }): React.JSX.Element {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Resumo do mês</Text>
        <Text style={styles.summaryHint}>previsto → real</Text>
      </View>

      <SummaryLine
        actualTestID="dashboard-total-received"
        expectedTestID="dashboard-income-expected"
        label="Receitas"
        pair={incomePair(data)}
        tone={colors.status.positive}
      />

      <SummaryLine
        actualTestID="dashboard-expense-actual"
        expectedTestID="dashboard-expense-expected"
        label="Despesas"
        pair={expensePair(data)}
        tone={colors.status.warning}
      />

      <SummaryLine
        actualTestID="dashboard-balance"
        expectedTestID="dashboard-balance-expected"
        label="Saldo"
        last
        pair={balancePair(data)}
        tone={colors.accent.base}
      />
    </View>
  );
}

function Groups({ data }: { data: MonthlyDashboard }): React.JSX.Element {
  return (
    <View style={styles.groups}>
      <GroupRow
        group={incomeGroup(data, 0)}
        href="/income"
        icon={Repeat}
        name="Receitas recorrentes"
        testID="dashboard-group-recurring-income"
        tone={colors.status.positive}
      />
      <GroupRow
        group={incomeGroup(data, 1)}
        href="/income"
        icon={Coins}
        name="Receitas variáveis"
        testID="dashboard-group-variable-income"
        tone={colors.status.positive}
      />
      <GroupRow
        group={recurringExpenseGroup(data)}
        href="/expenses"
        icon={CalendarClock}
        name="Despesas recorrentes"
        testID="dashboard-group-recurring-expenses"
        tone={colors.status.warning}
      />
      <GroupRow
        group={variableExpenseGroup(data)}
        href="/expenses"
        icon={ShoppingBag}
        name="Despesas variáveis"
        testID="dashboard-group-variable-expenses"
        tone={colors.status.warning}
      />
    </View>
  );
}

export function DashboardScreen(): React.JSX.Element {
  const [period, setPeriod] = useState(() => currentMonth());

  const month = useDashboard(period.year, period.month);
  const series = useDashboardSeries(period.year, period.month);
  const accounts = useAccounts();
  const people = usePeople();

  /** Null enquanto as pessoas não chegaram, ou se a consulta falhou — o cartão omite a linha. */
  const ownerOf = (personId: string): string | null =>
    people.data?.find((person) => person.id === personId)?.name ?? null;

  const renderAccounts = (): React.JSX.Element | null => {
    // A lista de contas não é o assunto da tela: enquanto ela não chega, ou se falhou, o mês fica.
    if (accounts.data === undefined) {
      return null;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>Minhas contas</Text>

        {accounts.data.length === 0 ? (
          <Pressable
            accessibilityLabel="Cadastrar conta"
            accessibilityRole="button"
            onPress={() => {
              router.push('/accounts');
            }}
            style={styles.emptyCard}
            testID="dashboard-accounts-empty"
          >
            <Plus color={colors.accent.base} size={20} />
            <Text style={styles.emptyCardLabel}>Cadastrar conta</Text>
          </Pressable>
        ) : (
          <ScrollView
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
            horizontal
            showsHorizontalScrollIndicator={false}
            // O passo é a largura do cartão mais o vão entre dois: sem somar o vão, o carrossel
            // acumula um deslocamento a cada parada e o terceiro cartão para fora de lugar.
            snapToInterval={card.width + space.md}
            style={styles.carousel}
            testID="dashboard-accounts"
          >
            {accounts.data.map((account) => (
              <AccountCard account={account} key={account.id} owner={ownerOf(account.personId)} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

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
        {/* Spec DASH AC4: os totais aparecem zerados num mês vazio, em vez de sumirem. */}
        <Summary data={month.data} />

        {empty ? (
          <EmptyState message="Nenhum registro neste mês. Receitas, despesas e contas recorrentes aparecem aqui assim que forem lançadas." />
        ) : (
          <Groups data={month.data} />
        )}

        {renderAccounts()}

        <QuickActions />
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

      {renderMonth()}
    </Screen>
  );
}
