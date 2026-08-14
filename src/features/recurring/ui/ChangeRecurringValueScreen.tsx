import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useChangeRecurringValue, useRecurringExpenses } from '@/features/recurring/api/useRecurring';
import { apiMessages } from '@/features/recurring/ui/errors';
import { todayApiDate } from '@/shared/lib/dates';
import { parseMoneyInput } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';
import { colors, space, type } from '@/shared/ui/theme';

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
 */
export function ChangeRecurringValueScreen(): React.JSX.Element {
  const bills = useRecurringExpenses();
  const change = useChangeRecurringValue();

  const [recurringExpenseId, setRecurringExpenseId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [validityStart, setValidityStart] = useState(() => todayApiDate());
  const [changeReason, setChangeReason] = useState('');

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
      <Text style={styles.title}>Alterar valor base</Text>

      <View testID="recurring-bill-picker">
        <Picker
          label="Conta"
          onChange={setRecurringExpenseId}
          options={(bills.data ?? []).map((bill) => ({ label: bill.name, value: bill.id }))}
          selected={recurringExpenseId}
        />
      </View>

      <Field label="Novo valor" onChangeText={setAmount} placeholder="2400,00" value={amount} />
      <Field
        label="Início da vigência"
        onChangeText={setValidityStart}
        placeholder="2026-09-01"
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

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text.primary,
    marginBottom: space.lg,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});
