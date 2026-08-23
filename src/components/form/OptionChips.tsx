import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import type { PickerOption } from '@/components/form/Picker';
import { fieldStyles } from '@/components/form/styles';
import { colors, control, radius, space, type } from '@/components/theme';

/**
 * Poucas opções, todas visíveis: o controle certo quando ler a lista inteira custa menos que abrir
 * uma folha.
 *
 * O selecionado é `surface.selected` com `border.default` e um check — não `accent.base`. O azul de
 * destaque é da ação primária da tela, e um formulário com quatro chips azuis e um botão azul não
 * tem destaque nenhum. O check existe porque cor não pode ser o único sinal.
 */
export function OptionChips<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
  error?: string;
}): React.JSX.Element {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>

      <View style={styles.options}>
        {options.map((option, index) => {
          const isSelected = option.value === selected;

          return (
            // Duas entradas de catálogo podem legitimamente ter o mesmo nome, então o índice as
            // mantém como opções separadas em vez de colapsá-las.
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${String(option.value)}-${index}`}
              onPress={() => {
                onChange(option.value);
              }}
              style={[styles.option, isSelected ? styles.optionSelected : null]}
            >
              {isSelected ? (
                // `lucide-react-native` forwards `testID` to the native SVG host as `data-testid`,
                // which RNTL's `getByTestId` never sees (it only matches a host node's own `testID`
                // prop). A plain `View` wrapper is the one host element the query can actually find.
                <View testID="chip-check">
                  <Check color={colors.text.primary} size={14} />
                </View>
              ) : null}
              <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error === undefined ? null : (
        <Text style={fieldStyles.error} testID="field-error">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    // O alvo confortável nas duas plataformas, e o mínimo que a spec fixa. Um chip de 26pt de
    // altura é um chip que erra.
    minHeight: control.size,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  optionSelected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.default,
  },
  optionLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.text.primary,
  },
});
