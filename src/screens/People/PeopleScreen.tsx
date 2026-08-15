import { useState } from 'react';
import { Text, View } from 'react-native';

import { useCreatePerson, usePeople } from '@/hooks/useCatalogue';
import { apiMessages, listErrorMessage } from '@/utils/errors/catalogue';
import { Field, SubmitButton } from '@/components/form';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';

import { styles } from './PeopleScreen.styles';

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
