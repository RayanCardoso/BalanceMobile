import { Text, TextInput, View } from 'react-native';

import { colors } from '@/components/theme';

import { fieldStyles } from './styles';

export function Field({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secure = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  /**
   * Masks what is typed. Opt-in and defaulted to `false` rather than left undefined, so every other
   * field carries an explicit "not secure" - a field that is merely missing the prop and a field
   * that asked not to be masked would otherwise look the same from outside.
   */
  secure?: boolean;
}): React.JSX.Element {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChangeText}
        placeholder={placeholder}
        // Without this the placeholder renders in the platform's dark default and disappears
        // against the field. Every colour on a dark surface has to be stated.
        placeholderTextColor={colors.text.muted}
        secureTextEntry={secure}
        style={[fieldStyles.input, error === undefined ? null : fieldStyles.invalid]}
        value={value}
      />
      {error === undefined ? null : (
        <Text style={fieldStyles.error} testID="field-error">
          {error}
        </Text>
      )}
    </View>
  );
}
