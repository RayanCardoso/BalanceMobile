import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCategories, useCreateCategory } from '@/features/catalogue/api/useCatalogue';
import type { CategoryPriority } from '@/features/catalogue/model/catalogue';
import { PRIORITY_LABEL, PRIORITY_OPTIONS } from '@/features/catalogue/model/priority';
import { apiMessages, listErrorMessage } from '@/features/catalogue/ui/errors';
import { Field, Picker, SubmitButton } from '@/shared/ui/form';
import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';
import { colors, radius, space, type } from '@/shared/ui/theme';

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
      <Text style={styles.title}>Categorias</Text>

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
