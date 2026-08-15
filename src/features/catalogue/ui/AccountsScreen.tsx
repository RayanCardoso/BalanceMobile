import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  useAccounts,
  useCreateAccount,
  usePeople,
} from '@/features/catalogue/api/useCatalogue';
import { apiMessages, listErrorMessage } from '@/features/catalogue/ui/errors';
import { formatMoney, parseMoneyInput, parseOptionalInt } from '@/shared/lib/money';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';
import { colors, radius, space, type } from '@/shared/ui/theme';

/**
 * Spec CAT AC1, AC2, AC4, AC5 and AC6.
 *
 * `closingDay`, `dueDay` and `limit` describe a credit card. An account without one - "Inter Débito"
 * in the seed data - has none of the three, and the API expects `null` in each, not `0` or `""`. The
 * text fields therefore parse to `number | null` rather than defaulting an empty box to zero.
 */
export function AccountsScreen(): React.JSX.Element {
  const people = usePeople();
  const accounts = useAccounts();
  const create = useCreateAccount();

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [limit, setLimit] = useState('');

  // Spec CAT AC6: with exactly one Person, the picker starts on them; with more than one, nothing is
  // preselected. Runs once the list arrives rather than on every render, so a user free to change
  // their mind after the fact is not overridden back.
  useEffect(() => {
    if (people.data?.length === 1 && personId === null) {
      setPersonId(people.data[0]!.id);
    }
  }, [people.data, personId]);

  const messages = create.isError ? apiMessages(create.error) : [];

  const submit = (): void => {
    if (personId === null) {
      return;
    }

    create.mutate(
      {
        name,
        institution,
        personId,
        closingDay: parseOptionalInt(closingDay),
        dueDay: parseOptionalInt(dueDay),
        limit: limit.trim() === '' ? null : parseMoneyInput(limit),
      },
      {
        onSuccess: () => {
          setName('');
          setInstitution('');
          setClosingDay('');
          setDueDay('');
          setLimit('');
        },
      }
    );
  };

  const renderList = (): React.JSX.Element => {
    if (accounts.isError) {
      return (
        <ErrorState
          message={listErrorMessage(accounts.error)}
          onRetry={() => {
            void accounts.refetch();
          }}
        />
      );
    }

    if (accounts.data === undefined) {
      return <Loading />;
    }

    if (accounts.data.length === 0) {
      return (
        <EmptyState message="Nenhuma conta cadastrada. Contas são de onde suas despesas saem." />
      );
    }

    return (
      <View style={styles.list} testID="account-list">
        {accounts.data.map((account) => (
          <View key={account.id} style={styles.row}>
            <Text style={styles.rowName}>{account.name}</Text>
            <Text style={styles.rowDetail}>{account.institution}</Text>
            {account.closingDay === null && account.dueDay === null && account.limit === null ? null : (
              <Text style={styles.rowDetail}>
                {[
                  account.closingDay === null ? null : `fecha dia ${String(account.closingDay)}`,
                  account.dueDay === null ? null : `vence dia ${String(account.dueDay)}`,
                  account.limit === null ? null : `limite ${formatMoney(account.limit)}`,
                ]
                  .filter((part) => part !== null)
                  .join(' · ')}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <Field label="Nome" onChangeText={setName} placeholder="Nubank Roxinho" value={name} />
      <Field
        label="Instituição"
        onChangeText={setInstitution}
        placeholder="Nu Pagamentos"
        value={institution}
      />

      {people.data !== undefined && people.data.length > 1 ? (
        <Picker
          label="Pessoa"
          onChange={setPersonId}
          options={people.data.map((person) => ({ label: person.name, value: person.id }))}
          selected={personId}
        />
      ) : null}

      <Field
        label="Dia de fechamento"
        onChangeText={setClosingDay}
        placeholder="Opcional"
        value={closingDay}
      />
      <Field label="Dia de vencimento" onChangeText={setDueDay} placeholder="Opcional" value={dueDay} />
      <Field label="Limite" onChangeText={setLimit} placeholder="Opcional" value={limit} />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Adicionar conta" onPress={submit} pending={create.isPending} />

      {renderList()}
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
  list: {
    gap: space.sm,
    marginTop: space.lg,
  },
  row: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: space.md,
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  rowDetail: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
  },
});
