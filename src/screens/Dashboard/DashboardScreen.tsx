import { Fragment, useState } from 'react';
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
import { AddMenu } from '@/components/AddMenu';
import { Money } from '@/components/Money';
import { MonthTrend } from '@/components/MonthTrend';
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

/**
 * O ícone é monocromático de propósito.
 *
 * Ele saía verde ou âmbar conforme a metade do mês, e a palavra ao lado já diz "Receitas" ou
 * "Despesas" — a cor não acrescentava informação nenhuma e gastava dois dos poucos destaques que a
 * tela tem. Verde e âmbar continuam nas barras do previsto × real, onde de fato significam algo.
 */
function GroupRow({
  testID,
  href,
  name,
  group,
  icon: Icon,
}: {
  testID: string;
  href: '/income' | '/expenses';
  name: string;
  group: Group;
  icon: LucideIcon;
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
      style={({ pressed }) => [styles.group, pressed ? styles.groupPressed : null]}
      testID={testID}
    >
      <View style={styles.groupIcon}>
        <Icon color={colors.text.secondary} size={18} />
      </View>

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

/**
 * As quatro partições num bloco só, separadas por régua interna em vez de quatro cartões soltos.
 *
 * Quatro cartões com borda própria são quatro objetos; um bloco com régua é uma lista, que é o que
 * eles são. É também o padrão que todo app de banco usa para exatamente esta forma — linha com
 * ícone, nome, valor e seta.
 */
function Groups({ data }: { data: MonthlyDashboard }): React.JSX.Element {
  const rows = [
    {
      group: incomeGroup(data, 0),
      href: '/income',
      icon: Repeat,
      name: 'Receitas recorrentes',
      testID: 'dashboard-group-recurring-income',
    },
    {
      group: incomeGroup(data, 1),
      href: '/income',
      icon: Coins,
      name: 'Receitas variáveis',
      testID: 'dashboard-group-variable-income',
    },
    {
      group: recurringExpenseGroup(data),
      href: '/expenses',
      icon: CalendarClock,
      name: 'Despesas recorrentes',
      testID: 'dashboard-group-recurring-expenses',
    },
    {
      group: variableExpenseGroup(data),
      href: '/expenses',
      icon: ShoppingBag,
      name: 'Despesas variáveis',
      testID: 'dashboard-group-variable-expenses',
    },
  ] as const;

  return (
    <View style={styles.groups}>
      {rows.map((row, index) => (
        <Fragment key={row.testID}>
          {/* A régua separa duas linhas, então não nasce antes da primeira. */}
          {index === 0 ? null : <View style={styles.rule} />}

          <GroupRow
            group={row.group}
            href={row.href}
            icon={row.icon}
            name={row.name}
            testID={row.testID}
          />
        </Fragment>
      ))}
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
            <Plus color={colors.accent.text} size={20} />
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
        {/*
          As contas vêm antes do detalhe do mês: depois do saldo, o que se quer saber é de onde ele
          sai. É a ordem que todo app de banco usa — saldo, cartões, e só então o extrato.
        */}
        {renderAccounts()}

        {/* Spec DASH AC4: os totais aparecem zerados num mês vazio, em vez de sumirem. */}
        <Summary data={month.data} />

        {empty ? (
          <EmptyState message="Nenhum registro neste mês. Receitas, despesas e contas recorrentes aparecem aqui assim que forem lançadas." />
        ) : (
          <Groups data={month.data} />
        )}
      </View>
    );
  };

  return (
    <Screen floating={<AddMenu />}>
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
