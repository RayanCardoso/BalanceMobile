import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useChangeIncomeValue, useIncomeMonth } from '@/features/income/api/useIncome';
import { apiMessages } from '@/features/income/ui/errors';
import { currentMonth, todayApiDate } from '@/shared/lib/dates';
import { parseMoneyInput, parseOptionalInt } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';
import { colors, space, type } from '@/shared/ui/theme';

/**
 * Spec INC AC7 - "send the new amount, the new expected day, the validity start and the change
 * reason".
 *
 * The validity start is what the API uses to close the previous version the day before, so a change
 * is a new version rather than an edit of the old one: last month's line keeps the value it was paid
 * against. Nothing here computes that; the four values go out and the API builds the timeline.
 *
 * No rule about which sources may be re-priced is applied here. A Variable source has no version and
 * the API says so in its own words (MAD-001, MAD-004); a second copy of that rule in the picker is a
 * rule that can disagree with the first.
 */
export function ChangeIncomeValueScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();

  const [period] = useState(() => {
    const year = Number(params.year);
    const month = Number(params.month);

    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : currentMonth();
  });

  const [incomeSourceId, setIncomeSourceId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [expectedDay, setExpectedDay] = useState('');
  const [validityStart, setValidityStart] = useState(() => todayApiDate());
  const [changeReason, setChangeReason] = useState('');

  const month = useIncomeMonth(period.year, period.month);
  const change = useChangeIncomeValue();

  const messages = change.isError ? apiMessages(change.error) : [];

  const submit = (): void => {
    if (incomeSourceId === null) {
      return;
    }

    change.mutate(
      {
        incomeSourceId,
        amount: parseMoneyInput(amount) ?? 0,
        expectedDay: parseOptionalInt(expectedDay) ?? 0,
        validityStart,
        changeReason,
      },
      {
        onSuccess: () => {
          setAmount('');
          setExpectedDay('');
          setChangeReason('');
        },
      }
    );
  };

  return (
    <Screen>
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

      <Field label="Novo valor" onChangeText={setAmount} placeholder="5500,00" value={amount} />
      <Field
        label="Novo dia esperado"
        onChangeText={setExpectedDay}
        placeholder="6"
        value={expectedDay}
      />
      <Field
        label="Início da vigência"
        onChangeText={setValidityStart}
        placeholder="2026-08-01"
        value={validityStart}
      />
      <Field
        label="Motivo da alteração"
        onChangeText={setChangeReason}
        placeholder="Dissídio anual"
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
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});
