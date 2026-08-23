import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fieldStyles } from '@/components/form/styles';

/**
 * A metade de dentro de todo campo que abre: rótulo em cima, uma caixa que mostra o que está
 * escolhido, e o erro embaixo.
 *
 * A caixa é a mesma do `Field`, de propósito. Um formulário onde a data, o texto e a categoria têm
 * três alturas e três bordas diferentes lê como três formulários empilhados.
 *
 * `value` nulo é a informação, não a ausência dela: é o que separa "nada escolhido ainda" —
 * `placeholder` em `text.muted` — de uma escolha feita, em `text.primary`.
 */
export function FieldTrigger({
  label,
  value,
  placeholder,
  icon,
  error,
  onPress,
}: {
  label: string;
  /** O que está escolhido, ou null quando nada está. */
  value: string | null;
  placeholder: string;
  icon: ReactNode;
  error?: string;
  onPress: () => void;
}): React.JSX.Element {
  const shown = value ?? placeholder;

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>

      <Pressable
        // Rótulo e valor numa frase só: sem isto o leitor de tela anuncia um botão chamado
        // "21/08/2026", sem dizer de que campo se trata.
        accessibilityLabel={`${label}, ${shown}`}
        accessibilityRole="button"
        onPress={onPress}
        style={[fieldStyles.box, error === undefined ? null : fieldStyles.invalid]}
      >
        <Text style={value === null ? fieldStyles.placeholder : fieldStyles.value}>{shown}</Text>
        {icon}
      </Pressable>

      {error === undefined ? null : (
        <Text style={fieldStyles.error} testID="field-error">
          {error}
        </Text>
      )}
    </View>
  );
}
