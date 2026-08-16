import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

/** Primary action used to open any of the new-account registration flows. */
export function RegisterButton({ href, label = "Nova conta" }: { href: Href, label?: string }): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel="Cadastrar nova conta"
        accessibilityRole="button"
        style={styles.button}
        testID="new-account-button"
      >
        <Text style={styles.label}>+ {label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    width: "40%",
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  buttonPressed: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.base,
  },
  icon: {
    color: colors.accent.base,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18,
  },
  label: {
    ...type.label,
    color: colors.accent.base,
    fontSize: 14,
  },
});
