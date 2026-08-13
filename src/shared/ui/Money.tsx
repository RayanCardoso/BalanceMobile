import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/shared/lib/money';

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
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  negative: {
    color: '#b3261e',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  neutral: {
    backgroundColor: '#e4e4e7',
  },
  positive: {
    backgroundColor: '#c8e6c9',
  },
  warning: {
    backgroundColor: '#ffe0b2',
  },
});

const toneStyles = {
  neutral: styles.neutral,
  positive: styles.positive,
  warning: styles.warning,
};
