import { Fragment, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Money } from '@/components/Money';
import { chart, colors, space, type } from '@/components/theme';
import type { MonthValue } from '@/hooks/useMonthSeries';
import { formatMoney } from '@/utils/money';
import { monthAbbrev, monthLabel } from '@/utils/dates';

/**
 * The trend line the month-scoped screens navigate with: a point per month, the selected one in the
 * middle, and a drag that moves the screen from month to month.
 *
 * It owns no data and no month. The series comes from the screen and moving reports the target back,
 * so a single screen still decides which month its queries are keyed on - the same contract the
 * arrows-only navigator had.
 *
 * The gesture is React Native's own `PanResponder` and `Animated` rather than Reanimated: Reanimated
 * 4 reaches for `react-native-worklets`' native module at import, which does not exist under Jest, so
 * every suite that rendered this component would die before its first assertion. A horizontal drag
 * that snaps needs neither.
 */

/**
 * How many months the drag asked for, limited to what the window actually holds.
 *
 * Dragging left advances, which is why the translation is negated: the content moves the opposite
 * way to the finger. Past `reach` there is no data, and snapping onto a month with no value would
 * answer a deliberate choice with a dash. A slot of zero is the state before the first layout, where
 * the division would answer `Infinity`.
 */
export function snapTarget(translationX: number, slotWidth: number, reach: number): number {
  if (slotWidth <= 0) {
    return 0;
  }

  const asked = Math.round(-translationX / slotWidth);

  // `Math.round` answers `-0` for a small drag to the right, and `-0` is a delta that reads as
  // negative everywhere it is compared.
  if (asked === 0) {
    return 0;
  }

  return Math.max(-reach, Math.min(reach, asked));
}

/** How far the drag has to travel before it counts as a drag and not as a tap. */
const DRAG_THRESHOLD = 4;

/** How long the line takes to settle onto the month the release chose. */
const SNAP_DURATION = 180;

/** The vertical position of a value, with the extremes kept off the edges of the drawing. */
const plot = (value: number, low: number, high: number): number => {
  const usable = chart.height - chart.padding * 2;

  // One point, or a series that never moved: a line pinned to an edge would read as a collapse
  // rather than as a month that stayed the same.
  if (high === low) {
    return chart.height / 2;
  }

  return chart.height - chart.padding - ((value - low) / (high - low)) * usable;
};

/**
 * The contiguous stretches of months that actually have a value.
 *
 * A month that has not arrived cuts the line rather than being interpolated over: drawing straight
 * through the gap would invent a value nobody read.
 */
const runsOf = (series: MonthValue[]): number[][] => {
  const runs: number[][] = [];
  let current: number[] = [];

  series.forEach((entry, index) => {
    if (entry.value === null) {
      if (current.length > 0) {
        runs.push(current);
        current = [];
      }

      return;
    }

    current.push(index);
  });

  if (current.length > 0) {
    runs.push(current);
  }

  return runs;
};

export function MonthTrend({
  series,
  year,
  month,
  onChange,
}: {
  series: MonthValue[];
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}): React.JSX.Element {
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const drag = useRef(new Animated.Value(0)).current;

  /*
   * `onLayout` is the truth, but it answers a frame late - and on this project's web target it does
   * not answer at all, which is not this component's to fix but is this component's to survive. A
   * width of zero puts every point at the same x and draws the five months as one vertical line, so
   * the first paint uses what the layout already implies: `Screen` pads its content by `space.lg` on
   * both sides, and nothing else eats width. The estimate is replaced the moment a real measurement
   * arrives.
   */
  const estimate = Math.max(0, windowWidth - space.lg * 2);
  const width = measured > 0 ? measured : estimate;

  // Read on the gesture's own callbacks, which close over the render they were created in. Kept in
  // refs so the responder created once still decides against the current window.
  const state = useRef({ series, year, month, onChange, slot: 0 });

  const found = series.findIndex((entry) => entry.year === year && entry.month === month);
  const selected = found === -1 ? Math.floor(series.length / 2) : found;
  const reach = Math.min(selected, series.length - 1 - selected);

  // Three months across the viewport: the selected one centred, with a neighbour showing on each
  // side and the rest of the series continuing past the edges.
  const slot = width / 3;
  const contentWidth = slot * series.length;

  state.current = { series, year, month, onChange, slot };

  const move = (delta: number) => (): void => {
    const target = series[selected + delta];

    if (target === undefined || delta === 0) {
      return;
    }

    onChange(target.year, target.month);
  };

  const responder = useRef(
    PanResponder.create({
      // Only a horizontal travel takes the gesture, so a vertical swipe still scrolls the screen.
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > DRAG_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => {
        drag.setValue(gesture.dx);
      },
      onPanResponderRelease: (_event, gesture) => {
        const current = state.current;
        const index = current.series.findIndex(
          (entry) => entry.year === current.year && entry.month === current.month
        );
        const centre = index === -1 ? Math.floor(current.series.length / 2) : index;
        const available = Math.min(centre, current.series.length - 1 - centre);
        const delta = snapTarget(gesture.dx, current.slot, available);
        const target = current.series[centre + delta];

        Animated.timing(drag, {
          toValue: -delta * current.slot,
          duration: SNAP_DURATION,
          useNativeDriver: true,
        }).start(() => {
          // Back to rest in the same tick the new month is reported: the recentred window puts the
          // chosen month where the animation just left the line, so nothing jumps.
          drag.setValue(0);

          if (delta !== 0 && target !== undefined) {
            current.onChange(target.year, target.month);
          }
        });
      },
    })
  ).current;

  const values = series.flatMap((entry) => (entry.value === null ? [] : [entry.value]));
  const low = Math.min(...values);
  const high = Math.max(...values);

  const pointAt = (index: number): { x: number; y: number } | null => {
    const entry = series[index];

    if (entry?.value === undefined || entry.value === null) {
      return null;
    }

    return { x: slot * index + slot / 2, y: plot(entry.value, low, high) };
  };

  const selectedValue = series[selected]?.value ?? null;
  const reading = `${monthLabel(year, month)}, ${
    selectedValue === null ? 'sem valor' : formatMoney(selectedValue)
  }`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.month}>{monthLabel(year, month)}</Text>
        {selectedValue === null ? (
          <Text style={styles.absent}>—</Text>
        ) : (
          <Money style={styles.value} value={selectedValue} />
        )}
      </View>

      {/*
        The accessible control and the gesture surface are two elements on purpose. A screen reader
        needs one adjustable node with a value and two actions; the pan needs an element that answers
        "no" to taking the touch on start, so the month a finger lands on still gets the press. Put
        on the same node, the responder's answer is what a screen reader's action would have to get
        past. The arrows stay outside it, so collapsing this node into one control does not swallow
        their labels.
      */}
      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel="Tendência dos meses"
        accessibilityRole="adjustable"
        accessibilityValue={{ text: reading }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            move(1)();
          }

          if (event.nativeEvent.actionName === 'decrement') {
            move(-1)();
          }
        }}
        onLayout={(event: LayoutChangeEvent) => {
          setMeasured(event.nativeEvent.layout.width);
        }}
        style={styles.viewport}
      >
        <View style={styles.surface} {...responder.panHandlers}>
          <View style={styles.guide} />

        <Animated.View
          style={[
            styles.content,
            { width: contentWidth, left: slot * (1 - selected), transform: [{ translateX: drag }] },
          ]}
        >
          <Svg height={chart.height} width={contentWidth}>
            {runsOf(series).map((run) => {
              const points = run.flatMap((index) => {
                const point = pointAt(index);

                return point === null ? [] : [point];
              });

              const first = points[0];
              const last = points[points.length - 1];

              if (first === undefined || last === undefined || points.length < 2) {
                return null;
              }

              const line = points
                .map((point, order) => `${order === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
                .join(' ');

              return (
                <Fragment key={`run-${run[0]}`}>
                  <Path
                    d={`${line} L${last.x} ${chart.height} L${first.x} ${chart.height} Z`}
                    fill={colors.accent.soft}
                  />
                  <Path
                    d={line}
                    fill="none"
                    stroke={colors.accent.base}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={chart.line}
                  />
                </Fragment>
              );
            })}

            {series.map((entry, index) => {
              const point = pointAt(index);

              if (point === null) {
                return null;
              }

              const isSelected = index === selected;

              return (
                <Circle
                  cx={point.x}
                  cy={point.y}
                  fill={isSelected ? colors.accent.base : colors.border.strong}
                  key={`${entry.year}-${entry.month}`}
                  r={isSelected ? chart.dotSelected : chart.dot}
                  stroke={isSelected ? colors.surface.base : undefined}
                  strokeWidth={isSelected ? chart.dotRing : 0}
                />
              );
            })}
          </Svg>

          <View style={styles.labels}>
            {series.map((entry, index) => (
              <Pressable
                accessibilityLabel={`${monthLabel(entry.year, entry.month)}, ${
                  entry.value === null ? 'sem valor' : formatMoney(entry.value)
                }`}
                accessibilityRole="button"
                key={`${entry.year}-${entry.month}`}
                onPress={move(index - selected)}
                style={[styles.slot, { width: slot }]}
              >
                <Text style={index === selected ? styles.labelSelected : styles.label}>
                  {monthAbbrev(entry.year, entry.month, year)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Mês anterior"
        accessibilityRole="button"
        disabled={reach === 0}
        onPress={move(-1)}
        style={[styles.arrow, styles.arrowLeft]}
      >
        <ChevronLeftIcon color={colors.text.secondary} size={16} />
      </Pressable>

      <Pressable
        accessibilityLabel="Próximo mês"
        accessibilityRole="button"
        disabled={reach === 0}
        onPress={move(1)}
        style={[styles.arrow, styles.arrowRight]}
      >
        <ChevronRightIcon color={colors.text.secondary} size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Sem cartão: o valor do mês é a primeira coisa da tela, e uma caixa em volta da primeira coisa
   * da tela só a afasta da borda. `overflow` fica porque é ele que corta os meses que continuam
   * para fora da janela enquanto o dedo arrasta.
   */
  card: {
    gap: space.sm,
    overflow: 'hidden',
    paddingVertical: space.lg,
    marginBottom: space.sm,
  },
  /** Alinhado à esquerda, com o resto da tela: um número deste tamanho centralizado vira pôster. */
  header: {
    alignItems: 'flex-start',
    gap: space.xs,
  },
  month: {
    ...type.caption,
    color: colors.text.muted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    ...type.hero,
  },
  absent: {
    ...type.hero,
    color: colors.text.muted,
  },
  viewport: {
    height: chart.height + space.xl,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  /** The pan lives here, an ancestor of the points: a tap starts on a point, a drag takes over. */
  surface: {
    flex: 1,
  },
  /** Marks where a release lands, so the snap is something the user can see coming. */
  guide: {
    backgroundColor: colors.border.subtle,
    bottom: space.xl,
    left: '50%',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  content: {
    position: 'absolute',
    top: 0,
  },
  labels: {
    flexDirection: 'row',
  },
  slot: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  label: {
    ...type.caption,
    color: colors.text.muted,
  },
  labelSelected: {
    ...type.label,
    color: colors.text.primary,
  },
  arrow: {
    justifyContent: 'center',
    padding: space.sm,
    position: 'absolute',
    top: space.lg,
  },
  arrowLeft: {
    left: space.xs,
  },
  arrowRight: {
    right: space.xs,
  },
});
