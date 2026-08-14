import { Image, StyleSheet, Text, View } from 'react-native';

import icon from '@/assets/images/icon.png';
import { colors, space, type } from '@/shared/ui/theme';

/**
 * The app's mark and name, drawn from the same file the launcher icon is generated from - the icon
 * a user taps on their home screen and the one at the top of the sign-in screen are one asset, so
 * they cannot drift apart.
 *
 * The mark is decorative next to a wordmark that already says "Balance", so it carries no
 * accessibility label: a screen reader announcing "Balance" twice is noise, not information.
 */

export function AppIcon({ size = 96 }: { size?: number }): React.JSX.Element {
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no"
      // Android's launcher rounds the icon itself; here the corner has to be asked for.
      source={icon}
      style={[styles.icon, { borderRadius: size * 0.2237, height: size, width: size }]}
      testID="app-icon"
    />
  );
}

export function BrandHeader({ tagline }: { tagline: string }): React.JSX.Element {
  return (
    <View style={styles.header}>
      <AppIcon />
      <Text style={styles.wordmark}>Balance</Text>
      <Text style={styles.tagline}>{tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    borderColor: colors.border.subtle,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    gap: space.sm,
  },
  wordmark: {
    ...type.title,
    color: colors.text.primary,
    fontSize: 28,
    letterSpacing: 0.5,
    marginTop: space.xs,
  },
  tagline: {
    ...type.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
