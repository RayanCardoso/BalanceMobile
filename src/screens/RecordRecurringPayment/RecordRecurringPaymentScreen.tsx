import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useExpenseMonth } from '@/hooks/useExpenses';
import {
  useRegisterRecurringPayment,
  useUpdateRecurringPayment,
} from '@/hooks/useRecurring';
import { apiMessages } from '@/utils/errors/recurring';
import { currentMonth, toApiDate, todayApiDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';
import { Field, Picker, SubmitButton } from '@/components/form';
import { DateField } from '@/components/DateField';
import { MonthNavigator } from '@/components/MonthNavigator';
import { Screen } from '@/components/states';

import { styles } from './RecordRecurringPaymentScreen.styles';

/**
 * Spec REC AC3 and AC4 - one screen, two verbs.
 *
 * The month's own line already carries `paymentId` (T49, T51): null means the bill has not been paid
 * this month and POSTs a new payment; present means it has, and the screen PUTs to that exact id
 * instead of sending a second POST the API would reject with `PAYMENT_ALREADY_RECORDED`. The id is
 * never re-derived or re-fetched - it is read straight off the line the month query already returned.
 */
export function RecordRecurringPaymentScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const [period, setPeriod] = useState(() => {
    const year = Number(params.year);
    const month = Number(params.month);

    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : currentMonth();
  });

  const [recurringExpenseId, setRecurringExpenseId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => todayApiDate());
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const month = useExpenseMonth(period.year, period.month);
  const register = useRegisterRecurringPayment();
  const update = useUpdateRecurringPayment();

  const selectedLine = month.data?.recurringLines.find(
    (line) => line.recurringExpenseId === recurringExpenseId
  );

  const mutation = selectedLine?.paymentId === undefined || selectedLine.paymentId === null
    ? register
    : update;

  const messages = mutation.isError ? apiMessages(mutation.error) : [];

  const submit = (): void => {
    if (recurringExpenseId === null || selectedLine === undefined) {
      return;
    }

    const onSuccess = (): void => {
      setAmountPaid('');
      setNotes('');
    };

    if (selectedLine.paymentId === null) {
      register.mutate(
        {
          recurringExpenseId,
          referenceMonth: toApiDate({ year: period.year, month: period.month, day: 1 }),
          paymentDate,
          amountPaid: parseMoneyInput(amountPaid) ?? 0,
          notes: notes.trim() === '' ? null : notes,
          accountId: null,
        },
        { onSuccess }
      );

      return;
    }

    update.mutate(
      {
        paymentId: selectedLine.paymentId,
        paymentDate,
        amountPaid: parseMoneyInput(amountPaid) ?? 0,
        notes: notes.trim() === '' ? null : notes,
        accountId: null,
      },
      { onSuccess }
    );
  };

  const submitLabel =
    selectedLine !== undefined && selectedLine.paymentId !== null
      ? 'Corrigir pagamento'
      : 'Registrar pagamento';

  return (
    <Screen>
      <Text style={styles.sectionLabel}>Mês de referência</Text>
      <MonthNavigator
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
          setRecurringExpenseId(null);
        }}
        year={period.year}
      />

      <View testID="recurring-bill-picker">
        <Picker
          label="Conta"
          onChange={setRecurringExpenseId}
          options={(month.data?.recurringLines ?? []).map((line) => ({
            label: line.name,
            value: line.recurringExpenseId,
          }))}
          selected={recurringExpenseId}
        />
      </View>

      <DateField
        label="Data do pagamento"
        onChange={setPaymentDate}
        value={paymentDate}
      />
      <Field label="Valor pago" onChangeText={setAmountPaid} placeholder="220,00" value={amountPaid} />
      <Field label="Observações" onChangeText={setNotes} placeholder="Opcional" value={notes} />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label={submitLabel} onPress={submit} pending={mutation.isPending} />
    </Screen>
  );
}
