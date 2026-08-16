import { Link, type Href } from 'expo-router';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';

import { colors, radius, space, type } from '@/components/theme';

type RegisterButtonProps = {
  href: Href;
  label?: string;
  style?: StyleProp<ViewStyle>;
  icon?: LucideIcon;
};

export function RegisterButton({
  href,
  label = 'Nova conta',
  style,
  icon: Icon = Plus,
}: RegisterButtonProps): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        style={StyleSheet.flatten([styles.button, style])}
        testID="new-account-button"
      >
        <Icon
          size={16}
          color={colors.text.primary}
          strokeWidth={2}
        />

        <Text style={styles.label}>{label}</Text>
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
    width: '40%',
    height: 40,
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

  label: {
    ...type.label,
    color: colors.text.primary,
    fontSize: 14,
  },
});