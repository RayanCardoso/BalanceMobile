import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthTrend, snapTarget } from '@/components/MonthTrend';
import type { MonthValue } from '@/hooks/useMonthSeries';

/**
 * Every expected month is a literal pair, never one derived with `shiftMonth` in the assertion
 * (lesson L-010).
 *
 * The pan itself is not exercised here: dragging a finger is a native gesture, and a test that faked
 * it would be testing the fake. What the drag *decides* is `snapTarget`, which is a pure function and
 * is pinned directly; what it *reports* is the same call the touch targets make, which is pinned
 * through them.
 */

const SLOT = 100;

describe('snapTarget', () => {
  it('advances a month when the drag went a slot to the left', () => {
    expect(snapTarget(-SLOT, SLOT, 2)).toBe(1);
  });

  it('goes back a month when the drag went a slot to the right', () => {
    expect(snapTarget(SLOT, SLOT, 2)).toBe(-1);
  });

  it('stays put when the drag did not reach half a slot', () => {
    expect(snapTarget(-40, SLOT, 2)).toBe(0);
    expect(snapTarget(40, SLOT, 2)).toBe(0);
  });

  it('rounds a drag past half a slot to the next month', () => {
    expect(snapTarget(-60, SLOT, 2)).toBe(1);
  });

  /** Past the window there is no data, and snapping onto a month with no value would show a dash. */
  it('never lands further than the window reaches', () => {
    expect(snapTarget(-SLOT * 9, SLOT, 2)).toBe(2);
    expect(snapTarget(SLOT * 9, SLOT, 2)).toBe(-2);
  });

  /** Before the first layout the slot width is zero, and dividing by it would answer `Infinity`. */
  it('answers zero while the width is still unmeasured', () => {
    expect(snapTarget(-250, 0, 2)).toBe(0);
  });
});

const series: MonthValue[] = [
  { year: 2026, month: 6, value: 1000 },
  { year: 2026, month: 7, value: 2000 },
  { year: 2026, month: 8, value: 1500 },
  { year: 2026, month: 9, value: 3000 },
  { year: 2026, month: 10, value: 2500 },
];

const renderTrend = (overrides: Partial<Parameters<typeof MonthTrend>[0]> = {}) => {
  const onChange = jest.fn();

  render(
    <MonthTrend series={series} year={2026} month={8} onChange={onChange} {...overrides} />
  );

  return onChange;
};

describe('MonthTrend', () => {
  it('names the selected month and shows its value in full', () => {
    renderTrend();

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
    expect(screen.getByText('R$ 1.500,00')).toBeTruthy();
  });

  it('labels every month of the window', () => {
    renderTrend();

    ['Jun', 'Jul', 'Ago', 'Set', 'Out'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  /** Five amounts stacked under five points is what the header exists to avoid. */
  it('spells out only the selected month, not every point', () => {
    renderTrend();

    expect(screen.queryByText('R$ 3.000,00')).toBeNull();
    expect(screen.queryByText('R$ 1.000,00')).toBeNull();
  });

  it('carries the year on a month outside the selected one', () => {
    renderTrend({
      series: [
        { year: 2025, month: 11, value: 100 },
        { year: 2025, month: 12, value: 200 },
        { year: 2026, month: 1, value: 300 },
        { year: 2026, month: 2, value: 400 },
        { year: 2026, month: 3, value: 500 },
      ],
      year: 2026,
      month: 1,
    });

    expect(screen.getByText('Dez 25')).toBeTruthy();
    expect(screen.getByText('Jan')).toBeTruthy();
  });

  it('reports the month whose point was touched', () => {
    const onChange = renderTrend();

    fireEvent.press(screen.getByLabelText('Setembro de 2026, R$ 3.000,00'));

    expect(onChange).toHaveBeenCalledWith(2026, 9);
  });

  it('reports nothing when the month touched is the one already shown', () => {
    const onChange = renderTrend();

    fireEvent.press(screen.getByLabelText('Agosto de 2026, R$ 1.500,00'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the previous and the next month from the arrows', () => {
    const onChange = renderTrend();

    fireEvent.press(screen.getByLabelText('Mês anterior'));
    expect(onChange).toHaveBeenCalledWith(2026, 7);

    fireEvent.press(screen.getByLabelText('Próximo mês'));
    expect(onChange).toHaveBeenCalledWith(2026, 9);
  });

  it('crosses a year boundary through the arrows', () => {
    const onChange = renderTrend({
      series: [
        { year: 2026, month: 10, value: 100 },
        { year: 2026, month: 11, value: 200 },
        { year: 2026, month: 12, value: 300 },
        { year: 2027, month: 1, value: 400 },
        { year: 2027, month: 2, value: 500 },
      ],
      year: 2026,
      month: 12,
    });

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    expect(onChange).toHaveBeenCalledWith(2027, 1);
  });

  describe('a month with no value yet', () => {
    const withHole: MonthValue[] = [
      { year: 2026, month: 6, value: 1000 },
      { year: 2026, month: 7, value: null },
      { year: 2026, month: 8, value: 1500 },
      { year: 2026, month: 9, value: null },
      { year: 2026, month: 10, value: 2500 },
    ];

    it('never reads as R$ 0,00', () => {
      renderTrend({ series: withHole });

      expect(screen.queryByText('R$ 0,00')).toBeNull();
    });

    it('is still labelled and still reachable', () => {
      const onChange = renderTrend({ series: withHole });

      expect(screen.getByText('Jul')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Julho de 2026, sem valor'));

      expect(onChange).toHaveBeenCalledWith(2026, 7);
    });

    it('shows a dash instead of an amount when it is the selected one', () => {
      renderTrend({ series: withHole, year: 2026, month: 9 });

      expect(screen.getByText('Setembro de 2026')).toBeTruthy();
      expect(screen.getByText('—')).toBeTruthy();
    });
  });

  /** Dragging does not exist for a screen reader, so the chart answers the same two steps. */
  it('offers the same two steps to a screen reader', () => {
    const onChange = renderTrend();

    const chart = screen.getByLabelText('Tendência dos meses');

    expect(chart.props.accessibilityValue).toEqual({ text: 'Agosto de 2026, R$ 1.500,00' });

    fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenCalledWith(2026, 9);

    fireEvent(chart, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenCalledWith(2026, 7);
  });

  it('changes nothing on its own, so the screen owns which month is loaded', () => {
    renderTrend();

    fireEvent.press(screen.getByLabelText('Próximo mês'));

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });
});
