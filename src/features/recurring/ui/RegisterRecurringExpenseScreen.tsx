import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useAccounts, useCategories, usePeople } from '@/features/catalogue/api/useCatalogue';
import { useRegisterRecurringExpense } from '@/features/recurring/api/useRecurring';
import { apiMessages } from '@/features/recurring/ui/errors';
import { parseMoneyInput, parseOptionalInt } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';

/**
 * Spec REC AC1. Registers a recurring bill's name, person, category, account, due day, base amount
 * and whether that amount is an estimate.
 *
 * An amount or a due day that does not parse is sent as `0`, which the API answers with its own
 * message (`AMOUNT_GREATER_THAN_ZERO`, `DAY_OUT_OF_RANGE`) - MAD-001, MAD-004. The alternative would
 * be a client-side rule and a client-side sentence that could drift from the API's own.
 */

type EstimateChoice = 'estimate' | 'fixed';

const ESTIMATE_OPTIONS: { label: string; value: EstimateChoice }[] = [
  { label: 'Estimativa', value: 'estimate' },
  { label: 'Valor fixo', value: 'fixed' },
];

export function RegisterRecurringExpenseScreen(): React.JSX.Element {
  const people = usePeople();
  const categories = useCategories();
  const accounts = useAccounts();
  const register = useRegisterRecurringExpense();

  const [name, setName] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dueDay, setDueDay] = useState('');
  const [amount, setAmount] = useState('');
  const [estimateChoice, setEstimateChoice] = useState<EstimateChoice>('estimate');

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
        categoryId,
        accountId,
        dueDay: parseOptionalInt(dueDay) ?? 0,
        amount: parseMoneyInput(amount) ?? 0,
        isEstimate: estimateChoice === 'estimate',
      },
      {
        onSuccess: () => {
          setName('');
          setDueDay('');
          setAmount('');
          setEstimateChoice('estimate');
        },
      }
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Nova conta recorrente</Text>

      <Field label="Nome" onChangeText={setName} placeholder="Aluguel" value={name} />

      {people.data !== undefined && people.data.length > 1 ? (
        <Picker
          label="Pessoa"
          onChange={setPersonId}
          options={people.data.map((person) => ({ label: person.name, value: person.id }))}
          selected={personId}
        />
      ) : null}

      {categories.data !== undefined ? (
        <Picker
          label="Categoria"
          onChange={setCategoryId}
          options={categories.data.map((category) => ({ label: category.name, value: category.id }))}
          selected={categoryId}
        />
      ) : null}

      {accounts.data !== undefined ? (
        <Picker
          label="Conta"
          onChange={setAccountId}
          options={accounts.data.map((account) => ({ label: account.name, value: account.id }))}
          selected={accountId}
        />
      ) : null}

      <Field label="Dia de vencimento" onChangeText={setDueDay} placeholder="10" value={dueDay} />
      <Field label="Valor base" onChangeText={setAmount} placeholder="2250,00" value={amount} />

      <Picker
        label="Tipo de valor"
        onChange={setEstimateChoice}
        options={ESTIMATE_OPTIONS}
        selected={estimateChoice}
      />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Cadastrar conta" onPress={submit} pending={register.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  error: {
    color: '#b3261e',
    fontSize: 14,
    marginBottom: 8,
  },
});
