import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { formatMoney } from '@/utils/money';
import { colors, radius, space, type } from '@/components/theme';
import { Circle, CircleAlert, CircleCheck } from 'lucide-react-native';

/**
 * A value and a status, rendered the same way everywhere.
 *
 * The label a `StatusBadge` shows is decided by the feature that owns the status - income and
 * expense keep separate maps even though their integers coincide, so a rename on one side cannot
 * retitle the other. This component only knows how to draw one.
 */

export type StatusTone = 'neutral' | 'positive' | 'warning';

export function Money({ value, style }: { value: number, style?: StyleProp<TextStyle> }): React.JSX.Element {
  // A negative balance is money owed, and the sign is the whole point (spec DASH AC5). It stays in
  // the text; the colour is a second signal, not a replacement for it.
  return (
    <Text style={[styles.value, value < 0 ? styles.negative : null, style]}>{formatMoney(value)}</Text>
  );
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}): React.JSX.Element {
  const Icon = typeIcons[tone];

  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Icon size={10} color={colors.status[tone]} />
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    ...type.money,
    color: colors.text.primary,
  },
  negative: {
    color: colors.status.negative,
  },
  badge: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  badgeLabel: {
    ...type.caption,
    fontWeight: '600',
    color: colors.text.primary
  },
  neutral: {
    borderWidth: 1,
    borderColor: colors.status.neutral,
  },
  positive: {
    borderWidth: 1,
    borderColor: colors.status.positive,
  },
  warning: {
    borderWidth: 1,
    borderColor: colors.status.warning,
  }
});

const toneStyles = {
  neutral: styles.neutral,
  positive: styles.positive,
  warning: styles.warning,
};

const typeIcons = {
  neutral: Circle,
  positive: CircleCheck,
  warning: CircleAlert,
};
