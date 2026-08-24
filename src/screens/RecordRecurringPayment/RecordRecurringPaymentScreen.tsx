import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useExpenseMonth } from '@/hooks/useExpenses';
import { useRegisterRecurringPayment, useUpdateRecurringPayment } from '@/hooks/useRecurring';
import { EXPENSE_TYPE_OPTIONS, type ExpenseType } from '@/types/expense';
import { apiMessages } from '@/utils/errors/recurring';
import { currentMonth, toApiDate, todayApiDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';
import { DateField, Field, MonthField, Picker, SubmitButton } from '@/components/form';
import { Screen } from '@/components/states';

import { styles } from './RecordRecurringPaymentScreen.styles';

/**
 * Spec REC AC3 and AC4 - one screen, two verbs.
 *
 * The month's own line already carries `paymentId` (T49, T51): null means the bill has not been paid
 * this month and POSTs a new payment; present means it has, and the screen PUTs to that exact id
 * instead of sending a second POST the API would reject with `PAYMENT_ALREADY_RECORDED`. The id is
 * never re-derived or re-fetched - it is read straight off the line the month query already returned.
 *
 * A conta pode chegar de dois jeitos, e a diferença é só quem escolheu. Vindo do menu de uma linha do
 * mês, `recurringExpenseId` chega por parâmetro e não há o que escolher — a conta já foi escolhida
 * lá. Aberta pela rota direta, a tela mostra o seletor. O mês de referência continua sendo um
 * controle nos dois casos: uma conta de agosto paga em setembro é exatamente o caso que a spec nomeia,
 * e mover o mês troca a linha lida — e com ela o `paymentId` que decide entre POST e PUT.
 */
export function RecordRecurringPaymentScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    year?: string;
    month?: string;
    recurringExpenseId?: string;
  }>();

  const [period, setPeriod] = useState(() => {
    const year = Number(params.year);
    const month = Number(params.month);

    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : currentMonth();
  });

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => todayApiDate());
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  /** Null enquanto o usuário não trocar: aí vale o tipo que a própria linha já carrega. */
  const [pickedType, setPickedType] = useState<ExpenseType | null>(null);

  const month = useExpenseMonth(period.year, period.month);
  const register = useRegisterRecurringPayment();
  const update = useUpdateRecurringPayment();

  const recurringExpenseId = params.recurringExpenseId ?? pickedId;

  const selectedLine = month.data?.recurringLines.find(
    (line) => line.recurringExpenseId === recurringExpenseId
  );

  const paymentType = pickedType ?? selectedLine?.type ?? null;

  const mutation =
    selectedLine?.paymentId === undefined || selectedLine.paymentId === null ? register : update;

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
          type: paymentType,
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
        type: paymentType,
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
      <MonthField
        label="Mês de referência"
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
          setPickedId(null);
        }}
        year={period.year}
      />

      {params.recurringExpenseId === undefined ? (
        <View testID="recurring-bill-picker">
          <Picker
            label="Conta"
            onChange={setPickedId}
            options={(month.data?.recurringLines ?? []).map((line) => ({
              label: line.name,
              value: line.recurringExpenseId,
            }))}
            selected={pickedId}
          />
        </View>
      ) : (
        <Text style={styles.billName} testID="recurring-bill-name">
          {selectedLine?.name ?? '—'}
        </Text>
      )}

      <DateField
        label="Data do pagamento"
        onChange={setPaymentDate}
        value={paymentDate}
      />
      <Field
        label="Valor pago"
        onChangeText={setAmountPaid}
        placeholder="220,00"
        value={amountPaid}
      />

      {/*
        O tipo é um sobrescrito **do mês**: a API guarda o tipo da conta e aceita outro para um mês
        que foi pago de outro jeito. Vem preenchido com o que a linha já mostra, então quem não tem
        nada a corrigir não precisa responder nada.
      */}
      <Picker
        label="Tipo de pagamento"
        onChange={setPickedType}
        options={EXPENSE_TYPE_OPTIONS}
        selected={paymentType}
      />

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
