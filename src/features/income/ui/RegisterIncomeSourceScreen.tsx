import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { usePeople } from '@/features/catalogue/api/useCatalogue';
import { useRegisterIncomeSource } from '@/features/income/api/useIncome';
import type { IncomeType } from '@/features/income/model/income';
import { apiMessages } from '@/features/income/ui/errors';
import { parseMoneyInput, parseOptionalInt } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';
import { colors, space, type } from '@/shared/ui/theme';

/**
 * Spec INC AC3 and AC4.
 *
 * A Recurring source carries an amount and an expected day; a Variable source carries neither, and
 * the API rejects one that sends either. The two fields are therefore not merely disabled for a
 * Variable source - they are not rendered and not sent.
 *
 * An amount that does not parse is sent as `0`, which the API answers with its own
 * "greater than zero" message (MAD-001, MAD-004). The alternative would be a client-side rule and a
 * client-side sentence, and the two copies would drift apart the first time the API changed its own.
 */

const TYPE_OPTIONS: { label: string; value: IncomeType }[] = [
  { label: 'Recorrente', value: 0 },
  { label: 'Variável', value: 1 },
];

export function RegisterIncomeSourceScreen(): React.JSX.Element {
  const people = usePeople();
  const register = useRegisterIncomeSource();

  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeType>(0);
  const [personId, setPersonId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [expectedDay, setExpectedDay] = useState('');

  // Spec CAT AC6: a form needing a person preselects the only one there is.
  useEffect(() => {
    if (people.data?.length === 1 && personId === null) {
      setPersonId(people.data[0]!.id);
    }
  }, [people.data, personId]);

  const messages = register.isError ? apiMessages(register.error) : [];

  const submit = (): void => {
    if (personId === null) {
      return;
    }

    const onSuccess = (): void => {
      setName('');
      setAmount('');
      setExpectedDay('');
    };

    if (type === 1) {
      register.mutate({ name, type: 1, personId }, { onSuccess });

      return;
    }

    register.mutate(
      {
        name,
        type: 0,
        personId,
        amount: parseMoneyInput(amount) ?? 0,
        expectedDay: parseOptionalInt(expectedDay) ?? 0,
      },
      { onSuccess }
    );
  };

  return (
    <Screen>
      <Field label="Nome" onChangeText={setName} placeholder="Salário" value={name} />

      <Picker label="Tipo" onChange={setType} options={TYPE_OPTIONS} selected={type} />

      {people.data !== undefined && people.data.length > 1 ? (
        <Picker
          label="Pessoa"
          onChange={setPersonId}
          options={people.data.map((person) => ({ label: person.name, value: person.id }))}
          selected={personId}
        />
      ) : null}

      {type === 0 ? (
        <>
          <Field label="Valor" onChangeText={setAmount} placeholder="5000,00" value={amount} />
          <Field
            label="Dia esperado"
            onChangeText={setExpectedDay}
            placeholder="5"
            value={expectedDay}
          />
        </>
      ) : null}

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Cadastrar fonte" onPress={submit} pending={register.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});
