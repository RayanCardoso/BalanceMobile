import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import type { PickerOption } from '@/components/form/Picker';
import { FieldTrigger } from '@/components/form/FieldTrigger';
import { Sheet } from '@/components/form/Sheet';
import { colors, radius, space, type } from '@/components/theme';

/** Acima disto, ler a lista inteira custa mais que digitar três letras. */
const SEARCHABLE_FROM = 8;

/** `'Saúde'` e `'saude'` têm de se encontrar: ninguém digita acento para buscar. */
const normalise = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Muitas opções, uma de cada vez: o campo mostra a escolha, a folha mostra a lista.
 *
 * A busca só aparece quando a lista é longa o bastante para justificá-la. Um campo de busca sobre
 * cinco linhas é um campo a mais para o usuário decidir se deve usar.
 */
export function SelectSheet<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
  placeholder: string;
  error?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const chosen = options.find((option) => option.value === selected);

  const close = (): void => {
    setOpen(false);
    // A busca não sobrevive ao fechamento: reabrir o campo e encontrar a lista já filtrada por uma
    // palavra que o usuário nem lembra ter digitado é uma lista que parece ter perdido opções.
    setQuery('');
  };

  const shown =
    query.trim() === ''
      ? options
      : options.filter((option) => normalise(option.label).includes(normalise(query.trim())));

  return (
    <>
      <FieldTrigger
        error={error}
        icon={<ChevronDown color={colors.text.secondary} size={18} />}
        label={label}
        onPress={() => {
          setOpen(true);
        }}
        placeholder={placeholder}
        value={chosen?.label ?? null}
      />

      <Sheet onClose={close} title={label} visible={open}>
        {options.length > SEARCHABLE_FROM ? (
          <TextInput
            accessibilityLabel="Buscar"
            onChangeText={setQuery}
            placeholder="Buscar"
            placeholderTextColor={colors.text.muted}
            style={styles.search}
            value={query}
          />
        ) : null}

        {shown.length === 0 ? (
          <Text style={styles.empty}>Nenhuma opção com esse nome.</Text>
        ) : null}

        {shown.map((option, index) => {
          const isSelected = option.value === selected;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${String(option.value)}-${index}`}
              onPress={() => {
                onChange(option.value);
                close();
              }}
              style={[styles.row, isSelected ? styles.rowSelected : null]}
            >
              <Text style={styles.rowLabel}>{option.label}</Text>
              {isSelected ? <Check color={colors.accent.base} size={18} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text.primary,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  rowSelected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.strong,
  },
  rowLabel: {
    ...type.body,
    color: colors.text.primary,
  },
  empty: {
    ...type.body,
    color: colors.text.secondary,
    paddingVertical: space.lg,
    textAlign: 'center',
  },
});
