import { useState } from 'react';
import { Text, View } from 'react-native';

import { useCategories, useCreateCategory } from '@/hooks/useCatalogue';
import type { CategoryPriority } from '@/types/catalogue';
import { PRIORITY_LABEL, PRIORITY_OPTIONS } from '@/types/priority';
import { apiMessages, listErrorMessage } from '@/utils/errors/catalogue';
import { Field, Picker, SubmitButton } from '@/components/form';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/states';

import { styles } from './CategoriesScreen.styles';

/**
 * Spec CAT AC1, AC2, AC3 and AC5, plus the edge case that two categories of the same user may share a
 * name (the API accepts duplicates by design; nothing here de-duplicates by name).
 */
export function CategoriesScreen(): React.JSX.Element {
  const categories = useCategories();
  const create = useCreateCategory();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CategoryPriority>(0);

  const messages = create.isError ? apiMessages(create.error) : [];

  const submit = (): void => {
    create.mutate(
      { name, description: description === '' ? null : description, priority },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setPriority(0);
        },
      }
    );
  };

  const renderList = (): React.JSX.Element => {
    if (categories.isError) {
      return (
        <ErrorState
          message={listErrorMessage(categories.error)}
          onRetry={() => {
            void categories.refetch();
          }}
        />
      );
    }

    if (categories.data === undefined) {
      return <Loading />;
    }

    if (categories.data.length === 0) {
      return <EmptyState message="Nenhuma categoria cadastrada. Categorias organizam suas despesas." />;
    }

    return (
      <View style={styles.list} testID="category-list">
        {categories.data.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.rowName}>{category.name}</Text>
            <Text style={styles.rowDetail}>{PRIORITY_LABEL[category.priority]}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <Field label="Nome" onChangeText={setName} placeholder="Mercado" value={name} />
      <Field
        label="Descrição"
        onChangeText={setDescription}
        placeholder="Opcional"
        value={description}
      />
      <Picker label="Prioridade" onChange={setPriority} options={PRIORITY_OPTIONS} selected={priority} />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton label="Adicionar categoria" onPress={submit} pending={create.isPending} />

      {renderList()}
    </Screen>
  );
}
