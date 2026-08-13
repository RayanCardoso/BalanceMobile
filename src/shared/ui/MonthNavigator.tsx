import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthLabel, shiftMonth } from '@/shared/lib/dates';

/**
 * The month control every month-scoped screen sits under. It holds no state: the year and month it
 * shows come from the screen, and moving reports the target back rather than mutating anything, so
 * a single screen decides which month its queries are keyed on.
 */
export function MonthNavigator({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}): React.JSX.Element {
  const move = (delta: number) => () => {
    const target = shiftMonth(year, month, delta);

    onChange(target.year, target.month);
  };

  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" onPress={move(-1)} style={styles.control}>
        <Text style={styles.controlLabel}>Mês anterior</Text>
      </Pressable>
      <Text style={styles.month}>{monthLabel(year, month)}</Text>
      <Pressable accessibilityRole="button" onPress={move(1)} style={styles.control}>
        <Text style={styles.controlLabel}>Próximo mês</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  control: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  month: {
    fontSize: 17,
    fontWeight: '700',
  },
});
