import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/shared/lib/money';
import { colors, radius, space, type } from '@/shared/ui/theme';

/**
 * A value and a status, rendered the same way everywhere.
 *
 * The label a `StatusBadge` shows is decided by the feature that owns the status - income and
 * expense keep separate maps even though their integers coincide, so a rename on one side cannot
 * retitle the other. This component only knows how to draw one.
 */

export type StatusTone = 'neutral' | 'positive' | 'warning';

export function Money({ value }: { value: number }): React.JSX.Element {
  // A negative balance is money owed, and the sign is the whole point (spec DASH AC5). It stays in
  // the text; the colour is a second signal, not a replacement for it.
  return (
    <Text style={[styles.value, value < 0 ? styles.negative : null]}>{formatMoney(value)}</Text>
  );
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}): React.JSX.Element {
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      {/* The tone tints the fill and the text together: on a dark surface the fill alone is too
          quiet to carry the status, and unstyled text on it would be black on near-black. */}
      <Text style={[styles.badgeLabel, toneLabelStyles[tone]]}>{label}</Text>
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
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
  badgeLabel: {
    ...type.caption,
    fontWeight: '600',
  },
  neutral: {
    backgroundColor: colors.status.neutralSoft,
  },
  positive: {
    backgroundColor: colors.status.positiveSoft,
  },
  warning: {
    backgroundColor: colors.status.warningSoft,
  },
  neutralLabel: {
    color: colors.status.neutral,
  },
  positiveLabel: {
    color: colors.status.positive,
  },
  warningLabel: {
    color: colors.status.warning,
  },
});

const toneStyles = {
  neutral: styles.neutral,
  positive: styles.positive,
  warning: styles.warning,
};

const toneLabelStyles = {
  neutral: styles.neutralLabel,
  positive: styles.positiveLabel,
  warning: styles.warningLabel,
};
