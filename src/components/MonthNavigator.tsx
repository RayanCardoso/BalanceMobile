import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthLabel, shiftMonth } from '@/utils/dates';
import { colors, radius, space, type } from '@/components/theme';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react-native';

import { MonthTrend } from '@/components/MonthTrend';
import type { MonthValue } from '@/hooks/useMonthSeries';

/**
 * The month control every month-scoped screen sits under. It holds no state: the year and month it
 * shows come from the screen, and moving reports the target back rather than mutating anything, so
 * a single screen decides which month its queries are keyed on.
 *
 * It has two forms, and `series` chooses between them. A screen that reads a month has a value per
 * month to show, and gets the trend line: the months around this one, plotted, draggable. A screen
 * that uses this control as a *field* - which month a launch belongs to - has no such value, passes
 * nothing, and keeps the bar. The absence of a series is the information, which is why this is one
 * component and not two: the screens never choose a form, they only say whether they have data.
 */
export function MonthNavigator({
  year,
  month,
  onChange,
  series,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  series?: MonthValue[];
}): React.JSX.Element {
  const move = (delta: number) => () => {
    const target = shiftMonth(year, month, delta);

    onChange(target.year, target.month);
  };

  if (series !== undefined) {
    return <MonthTrend month={month} onChange={onChange} series={series} year={year} />;
  }

  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" onPress={move(-1)} style={styles.control}>
        <ArrowLeftIcon size={12} color={colors.text.primary} />
        <Text style={styles.controlLabel}>Mês anterior</Text>
      </Pressable>
      <Text style={styles.month}>{monthLabel(year, month)}</Text>
      <Pressable accessibilityRole="button" onPress={move(1)} style={styles.control}>
        <Text style={styles.controlLabel}>Próximo mês</Text>
        <ArrowRightIcon size={12} color={colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    paddingVertical: space.md
  },
  control: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    alignItems: "center",
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  controlLabel: {
    ...type.label,
    color: colors.text.primary,
    fontSize: 10
  },
  month: {
    ...type.heading,
    color: colors.text.primary,
    fontWeight: '700',
  },
});
