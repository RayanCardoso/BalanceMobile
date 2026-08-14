import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useIncomeMonth, useRegisterIncomePayment } from '@/features/income/api/useIncome';
import { apiMessages } from '@/features/income/ui/errors';
import { currentMonth, toApiDate, todayApiDate } from '@/shared/lib/dates';
import { parseMoneyInput } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { MonthNavigator } from '@/shared/ui/MonthNavigator';
import { Screen } from '@/shared/ui/states';
import { colors, space, type } from '@/shared/ui/theme';

/**
 * Spec INC AC5 - "send the reference month separately from the payment date".
 *
 * The two are different facts and are two different controls here. A salary paid on 3 September for
 * August is the case the story's Independent Test names: the payment date says when the money
 * arrived, the reference month says which month it belongs to, and a form that reused one for the
 * other would move August's salary into September.
 *
 * The reference month starts on the month the user was looking at and moves on its own from there.
 * Nothing keeps the payment date in step with it.
 *
 * Spec INC AC9: nothing here refuses a second payment for the same source and month. Income sums
 * several payments in one month, unlike a recurring bill, which the API rejects.
 */
export function RecordIncomePaymentScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const [period, setPeriod] = useState(() => {
    const year = Number(params.year);
    const month = Number(params.month);

    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : currentMonth();
  });

  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => todayApiDate());
  const [amountReceived, setAmountReceived] = useState('');
  const [notes, setNotes] = useState('');

  const month = useIncomeMonth(period.year, period.month);
  const record = useRegisterIncomePayment();

  const messages = record.isError ? apiMessages(record.error) : [];

  const submit = (): void => {
    if (incomeSourceId === null) {
      return;
    }

    record.mutate(
      {
        incomeSourceId,
        paymentDate,
        // Any day inside the month; the API normalises it to the first.
        referenceMonth: toApiDate({ year: period.year, month: period.month, day: 1 }),
        amountReceived: parseMoneyInput(amountReceived) ?? 0,
        notes: notes.trim() === '' ? null : notes,
      },
      {
        onSuccess: () => {
          setAmountReceived('');
          setNotes('');
        },
      }
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Registrar recebimento</Text>

      <Text style={styles.sectionLabel}>Mês de referência</Text>
      <MonthNavigator
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
          setIncomeSourceId(null);
        }}
        year={period.year}
      />

      <View testID="income-source-picker">
        <Picker
          label="Fonte"
          onChange={setIncomeSourceId}
          options={(month.data?.lines ?? []).map((line) => ({
            label: line.name,
            value: line.incomeSourceId,
          }))}
          selected={incomeSourceId}
        />
      </View>

      <Field
        label="Data do pagamento"
        onChangeText={setPaymentDate}
        placeholder="2026-09-03"
        value={paymentDate}
      />
      <Field
        label="Valor recebido"
        onChangeText={setAmountReceived}
        placeholder="5000,00"
        value={amountReceived}
      />
      <Field label="Observações" onChangeText={setNotes} placeholder="Opcional" value={notes} />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton
        label="Registrar pagamento"
        onPress={submit}
        pending={record.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text.primary,
  },
  sectionLabel: {
    ...type.label,
    color: colors.text.secondary,
    marginTop: space.sm,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});
