import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useAccounts, useCategories, usePeople } from '@/hooks/useCatalogue';
import { useRegisterInstallmentPlan } from '@/hooks/useExpenses';
import type { InstallmentPlan } from '@/types/expense';
import { apiMessages } from '@/utils/errors/expenses';
import { fromApiDate, monthLabel, todayApiDate } from '@/utils/dates';
import { parseMoneyInput, parseOptionalInt } from '@/utils/money';
import { Field, Picker, SubmitButton } from '@/components/form';
import { DateField } from '@/components/DateField';
import { Money } from '@/components/Money';
import { Screen } from '@/components/states';

import { styles } from './RegisterInstallmentPlanScreen.styles';

/**
 * Spec INST AC1 through AC4 - one decision producing one charge per month.
 *
 * **Nothing here divides anything (MAD-001).** 100,00 in 3 is 33,33 / 33,33 / 33,34, and where the
 * residual cent lands is the server's rule. The form sends the total, the count and the start date;
 * what comes back is rendered as it arrived, installment by installment, each with the competence
 * month the API gave it. A client that recomputed the split would agree with the server until the
 * first rounding case and then disagree forever.
 */
function PlanSummary({ plan }: { plan: InstallmentPlan }): React.JSX.Element {
  return (
    <View style={styles.summary} testID="plan-summary">
      <Text style={styles.summaryTitle} testID="plan-count">
        {plan.installmentCount} parcelas criadas
      </Text>

      {plan.installments.map((installment) => {
        const month = fromApiDate(installment.competenceMonth);

        return (
          <View
            key={installment.id}
            style={styles.summaryRow}
            testID={`installment-${installment.installmentNumber}`}
          >
            <Text style={styles.summaryPosition}>
              {/* Spec INST AC3: the position is its number out of the plan's total. */}
              Parcela {installment.installmentNumber} de {plan.installmentCount}
            </Text>
            <Text style={styles.summaryMonth}>
              {month === null ? installment.competenceMonth : monthLabel(month.year, month.month)}
            </Text>
            {/* The amount the API returned, never one divided here. */}
            <Money value={installment.amount} />
          </View>
        );
      })}
    </View>
  );
}

export function RegisterInstallmentPlanScreen(): React.JSX.Element {
  const people = usePeople();
  const categories = useCategories();
  const accounts = useAccounts();
  const register = useRegisterInstallmentPlan();

  const [name, setName] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => todayApiDate());

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

    register.mutate({
      name,
      personId,
      totalAmount: parseMoneyInput(totalAmount) ?? 0,
      // A count the API rejects is the API's message to write (spec INST AC4), not the app's.
      installmentCount: parseOptionalInt(installmentCount) ?? 0,
      categoryId,
      accountId,
      startDate,
    });
  };

  return (
    <Screen>
      <Field label="Nome" onChangeText={setName} placeholder="Notebook" value={name} />

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

      <Field label="Valor total" onChangeText={setTotalAmount} placeholder="100,00" value={totalAmount} />
      <Field
        label="Número de parcelas"
        onChangeText={setInstallmentCount}
        placeholder="3"
        value={installmentCount}
      />

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
        label="Data da compra"
        onChange={setStartDate}
        value={startDate}
      />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Registrar parcelamento" onPress={submit} pending={register.isPending} />

      {register.data === undefined ? null : <PlanSummary plan={register.data} />}
    </Screen>
  );
}
