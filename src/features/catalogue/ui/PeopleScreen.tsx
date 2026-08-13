import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCreatePerson, usePeople } from '@/features/catalogue/api/useCatalogue';
import { apiMessages, listErrorMessage } from '@/features/catalogue/ui/errors';
import { Field, SubmitButton } from '@/shared/ui/form';
import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';

/**
 * Spec CAT AC1, AC2 and AC5.
 *
 * The form never resets on failure. A rejected create leaves the typed name and description exactly
 * where they were, so a message the API sent about one field does not cost the user the other.
 */
export function PeopleScreen(): React.JSX.Element {
  const people = usePeople();
  const create = useCreatePerson();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const messages = create.isError ? apiMessages(create.error) : [];

  const submit = (): void => {
    create.mutate(
      { name, description: description === '' ? null : description },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
        },
      }
    );
  };

  const renderList = (): React.JSX.Element => {
    if (people.isError) {
      return (
        <ErrorState
          message={listErrorMessage(people.error)}
          onRetry={() => {
            void people.refetch();
          }}
        />
      );
    }

    if (people.data === undefined) {
      return <Loading />;
    }

    if (people.data.length === 0) {
      return (
        <EmptyState message="Nenhuma pessoa cadastrada. As pessoas cadastradas aqui podem ser donas de contas e de despesas." />
      );
    }

    return (
      <View style={styles.list}>
        {people.data.map((person) => (
          <View key={person.id} style={styles.row}>
            <Text style={styles.rowName}>{person.name}</Text>
            {person.description === null ? null : (
              <Text style={styles.rowDetail}>{person.description}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>Pessoas</Text>

      <Field label="Nome" onChangeText={setName} placeholder="Marina" value={name} />
      <Field
        label="Descrição"
        onChangeText={setDescription}
        placeholder="Opcional"
        value={description}
      />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Adicionar pessoa" onPress={submit} pending={create.isPending} />

      {renderList()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  error: {
    color: '#b3261e',
    fontSize: 14,
    marginBottom: 8,
  },
  list: {
    gap: 8,
    marginTop: 16,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    padding: 12,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 13,
  },
});
