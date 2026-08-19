import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccounts, useCategories, usePeople } from '@/hooks/useCatalogue';
import { useRegisterExpense } from '@/hooks/useExpenses';
import { EXPENSE_TYPE_OPTIONS, type ExpenseType } from '@/types/expense';
import { apiMessages } from '@/utils/errors/expenses';
import { currentMonth, fromApiDate, monthLabel, toApiDate, todayApiDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';
import { Field, Picker, SubmitButton } from '@/components/form';
import { DateField } from '@/components/DateField';
import { MonthNavigator } from '@/components/MonthNavigator';
import { Screen } from '@/components/states';

import { styles } from './RegisterExpenseScreen.styles';

/**
 * Spec EXP AC2 through AC8.
 *
 * **The competence month is the server's (MAD-001).** By default the request carries `date` and a
 * null `competenceMonth`, and the API derives which month the purchase belongs to from the account's
 * closing day. Nothing here computes it. A user who wants a different month says so, and that choice
 * is sent as an explicit override (AC4).
 *
 * **The answer can name a month the user is not looking at (AC6).** A credit purchase on the 21st
 * against an account closing on the 20th lands in the next month. The screen says which month that
 * was, because the alternative is a list that does not change and a user who concludes the expense
 * was lost. When the month the API returned is the one on screen there is nothing to say, and nothing
 * is said - a notice that always appears carries no information.
 *
 * **The account picker is not filtered to the chosen person (AC7).** An expense of one person may be
 * paid from another's account, deliberately, and the API accepts it. Filtering here would be a
 * client-side rule the server does not have.
 */
export function RegisterExpenseScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const [period] = useState(() => {
    const year = Number(params.year);
    const month = Number(params.month);

    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : currentMonth();
  });

  const people = usePeople();
  const categories = useCategories();
  const accounts = useAccounts();
  const register = useRegisterExpense();

  const [name, setName] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [type, setType] = useState<ExpenseType>(0);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayApiDate());
  const [overriding, setOverriding] = useState(false);
  const [overrideMonth, setOverrideMonth] = useState(() => period);
  const [landedIn, setLandedIn] = useState<string | null>(null);

  // Spec CAT AC6: a form needing a person preselects the only one there is.
  useEffect(() => {
    if (people.data?.length === 1 && personId === null) {
      setPersonId(people.data[0]!.id);
    }
  }, [people.data, personId]);

  const messages = register.isError ? apiMessages(register.error) : [];

  const submit = (): void => {
    if (personId === null || categoryId === null || accountId === null) {
      return;
    }

    register.mutate(
      {
        name,
        personId,
        type,
        amount: parseMoneyInput(amount) ?? 0,
        categoryId,
        accountId,
        date,
        // Null unless the user overrode it: the API's derivation is the rule (spec EXP AC3).
        competenceMonth: overriding
          ? toApiDate({ year: overrideMonth.year, month: overrideMonth.month, day: 1 })
          : null,
      },
      {
        onSuccess: (expense) => {
          const landed = fromApiDate(expense.competenceMonth);

          // Spec EXP AC6: only a month other than the one being viewed is worth saying out loud.
          setLandedIn(
            landed !== null && (landed.year !== period.year || landed.month !== period.month)
              ? monthLabel(landed.year, landed.month)
              : null
          );
          setName('');
          setAmount('');
        },
      }
    );
  };

  return (
    <Screen>
      <Field label="Nome" onChangeText={setName} placeholder="Mercado" value={name} />

      {people.data !== undefined && people.data.length > 1 ? (
        <View testID="person-picker">
          <Picker
            label="Pessoa"
            onChange={setPersonId}
            options={people.data.map((person) => ({ label: person.name, value: person.id }))}
            selected={personId}
          />
        </View>
      ) : null}

      <View testID="type-picker">
        <Picker label="Tipo" onChange={setType} options={EXPENSE_TYPE_OPTIONS} selected={type} />
      </View>

      <Field label="Valor" onChangeText={setAmount} placeholder="320,50" value={amount} />

      <View testID="category-picker">
        <Picker
          label="Categoria"
          onChange={setCategoryId}
          options={(categories.data ?? []).map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          selected={categoryId}
        />
      </View>

      {/* Every account of the household, whoever it belongs to (spec EXP AC7). */}
      <View testID="account-picker">
        <Picker
          label="Conta"
          onChange={setAccountId}
          options={(accounts.data ?? []).map((account) => ({
            label: account.name,
            value: account.id,
          }))}
          selected={accountId}
        />
      </View>

      <DateField
        label="Data"
        onChange={setDate}
        value={date}
      />

      <View testID="competence-override">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: overriding }}
          onPress={() => {
            setOverriding((current) => !current);
          }}
          style={styles.toggle}
        >
          <Text style={styles.toggleLabel}>
            {overriding ? 'Usar o mês definido pela API' : 'Definir o mês de competência'}
          </Text>
        </Pressable>

        {overriding ? (
          <MonthNavigator
            month={overrideMonth.month}
            onChange={(year, month) => {
              setOverrideMonth({ year, month });
            }}
            year={overrideMonth.year}
          />
        ) : null}
      </View>

      {landedIn === null ? null : (
        <Text style={styles.notice} testID="competence-notice">
          Lançado em {landedIn}.
        </Text>
      )}

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Registrar despesa" onPress={submit} pending={register.isPending} />
    </Screen>
  );
}
