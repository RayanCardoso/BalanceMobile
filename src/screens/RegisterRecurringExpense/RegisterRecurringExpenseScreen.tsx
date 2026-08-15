import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { useAccounts, useCategories, usePeople } from '@/hooks/useCatalogue';
import { useRegisterRecurringExpense } from '@/hooks/useRecurring';
import { apiMessages } from '@/utils/errors/recurring';
import { parseMoneyInput, parseOptionalInt } from '@/utils/money';
import { Field, Picker, SubmitButton } from '@/components/form';
import { Screen } from '@/components/states';
import { EXPENSE_TYPE_LABEL, EXPENSE_TYPE_OPTIONS, type ExpenseType } from '@/types/recurring';

import { styles } from './RegisterRecurringExpenseScreen.styles';

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
  const [expenseType, setExpenseType] = useState<ExpenseType | null>(null);
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
    if (personId === null || categoryId === null || expenseType == null) {
      return;
    }

    if(expenseType == 0 && accountId == null) {
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
        type: expenseType
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

      <Picker
        label="Tipo de pagamento"
        onChange={setExpenseType}
        options={EXPENSE_TYPE_OPTIONS.map((expenseType) => ({ label: expenseType.label, value: expenseType.value }))}
        selected={expenseType}
      />

      {expenseType === 0 && (
        <>
          {accounts.data !== undefined ? (
            <Picker
              label="Conta"
              onChange={setAccountId}
              options={accounts.data.map((account) => ({ label: account.name, value: account.id }))}
              selected={accountId}
            />
          ) : null}

        </>
      )}
      
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
