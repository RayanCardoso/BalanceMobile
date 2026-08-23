import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

import { fieldStyles } from './styles';

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
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
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

const styles = StyleSheet.create({
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
    color: colors.accent.base,
  },
});
