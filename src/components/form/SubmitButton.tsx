import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, disabledOpacity, radius, space, type } from '@/components/theme';

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
