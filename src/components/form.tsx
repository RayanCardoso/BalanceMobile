import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, disabledOpacity, radius, space, type } from '@/components/theme';

/**
 * The three controls every form in the app is built from.
 *
 * `Field` renders an error it is handed and never produces one. Validation belongs to the API
 * (MAD-001, MAD-004); the app checks emptiness and number format only, and the text under a field
 * is whatever the API said about it.
 */

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
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChangeText}
        placeholder={placeholder}
        // Without this the placeholder renders in the platform's dark default and disappears
        // against the field. Every colour on a dark surface has to be stated.
        placeholderTextColor={colors.text.muted}
        secureTextEntry={secure}
        style={[styles.input, error === undefined ? null : styles.inputInvalid]}
        value={value}
      />
      {error === undefined ? null : (
        <Text style={styles.error} testID="field-error">
          {error}
        </Text>
      )}
    </View>
  );
}

export type PickerOption<T> = { label: string; value: T };

export function Picker<T extends string | number>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option, index) => (
          // Two catalogue entries may legitimately carry the same name, so the index keeps them
          // apart as separate options rather than collapsing them.
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === selected }}
            key={`${String(option.value)}-${index}`}
            onPress={() => {
              onChange(option.value);
            }}
            style={[styles.option, option.value === selected ? styles.optionSelected : null]}
          >
            <Text
              style={[
                styles.optionLabel,
                option.value === selected ? styles.optionLabelSelected : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SubmitButton({
  label,
  pending,
  onPress,
}: {
  label: string;
  pending: boolean;
  onPress: () => void;
}): React.JSX.Element {
  // Spec UX AC4. The control is disabled while the mutation is in flight, and the handler refuses
  // as well - a second press must not reach the API however it arrives.
  const handlePress = (): void => {
    if (pending) {
      return;
    }

    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: pending }}
      disabled={pending}
      onPress={handlePress}
      style={[styles.submit, pending ? styles.submitPending : null]}
    >
      <Text style={styles.submitLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space.xs + 2,
    marginBottom: space.lg,
  },
  label: {
    ...type.label,
    color: colors.text.secondary,
  },
  input: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  inputInvalid: {
    borderColor: colors.status.negative,
  },
  error: {
    ...type.caption,
    color: colors.status.negative,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  option: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  optionSelected: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.base,
  },
  optionLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.accent.text,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.accent.base,
    borderRadius: radius.sm,
    paddingVertical: space.md + 2,
  },
  submitPending: {
    opacity: disabledOpacity,
  },
  submitLabel: {
    ...type.label,
    color: colors.text.onAccent,
    fontSize: 16,
  },
});
