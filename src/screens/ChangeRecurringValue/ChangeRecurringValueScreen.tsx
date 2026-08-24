import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useChangeRecurringValue, useRecurringExpenses } from '@/hooks/useRecurring';
import { apiMessages } from '@/utils/errors/recurring';
import { todayApiDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';
import { Field, Picker, SubmitButton } from '@/components/form';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/states';

import { styles } from './ChangeRecurringValueScreen.styles';

/**
 * Spec REC AC6 - "send the new amount, the validity start and the change reason".
 *
 * The validity start is what the API uses to close the version in effect the day before, so a change
 * is a new version rather than an edit of the old one: earlier months keep the value they were priced
 * under. Nothing here computes that timeline; the three values go out and the API builds it.
 *
 * No client-side check that the validity start is later than the current version's, and no check that
 * the reason is non-empty (MAD-001, MAD-004): `VALIDITY_START_MUST_BE_LATER` and
 * `CHANGE_REASON_REQUIRED` are the API's own rules, and a second copy here could disagree with them.
 *
 * `recurringExpenseId` chega por parâmetro quando quem abriu a tela foi o menu de uma linha do mês —
 * ali a conta já foi escolhida, e repetir o seletor seria pedir de novo a mesma resposta. Pela rota
 * direta, o seletor continua sendo a única forma de dizer qual conta é.
 */
export function ChangeRecurringValueScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ recurringExpenseId?: string }>();

  const bills = useRecurringExpenses();
  const change = useChangeRecurringValue();

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [validityStart, setValidityStart] = useState(() => todayApiDate());
  const [changeReason, setChangeReason] = useState('');

  const recurringExpenseId = params.recurringExpenseId ?? pickedId;
  const selected = bills.data?.find((bill) => bill.id === recurringExpenseId);

  const messages = change.isError ? apiMessages(change.error) : [];

  const submit = (): void => {
    if (recurringExpenseId === null) {
      return;
    }

    change.mutate(
      {
        recurringExpenseId,
        amount: parseMoneyInput(amount) ?? 0,
        validityStart,
        changeReason,
      },
      {
        onSuccess: () => {
          setAmount('');
          setChangeReason('');
        },
      }
    );
  };

  return (
    <Screen>
      {params.recurringExpenseId === undefined ? (
        <View testID="recurring-bill-picker">
          <Picker
            label="Conta"
            onChange={setPickedId}
            options={(bills.data ?? []).map((bill) => ({ label: bill.name, value: bill.id }))}
            selected={pickedId}
          />
        </View>
      ) : (
        <Text style={styles.billName} testID="recurring-bill-name">
          {selected?.name ?? '—'}
        </Text>
      )}

      <Field label="Novo valor" onChangeText={setAmount} placeholder="2400,00" value={amount} />
      <DateField
        label="Início da vigência"
        onChange={setValidityStart}
        value={validityStart}
      />
      <Field
        label="Motivo da alteração"
        onChangeText={setChangeReason}
        placeholder="Reajuste anual"
        value={changeReason}
      />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Salvar novo valor" onPress={submit} pending={change.isPending} />
    </Screen>
  );
}
