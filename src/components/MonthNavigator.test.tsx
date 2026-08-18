import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthNavigator } from '@/components/MonthNavigator';

/**
 * Every expected month below is a literal pair. Computing one with `shiftMonth` in the assertion
 * would mirror the component and agree with it on any wrong answer (lesson L-010).
 */
describe('MonthNavigator', () => {
  it('names the month it is showing, in Portuguese', () => {
    render(<MonthNavigator year={2026} month={8} onChange={jest.fn()} />);

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });

  it('reports the previous month', () => {
    const onChange = jest.fn();
    render(<MonthNavigator year={2026} month={8} onChange={onChange} />);

    fireEvent.press(screen.getByText('Mês anterior'));

    expect(onChange).toHaveBeenCalledWith(2026, 7);
  });

  it('reports the next month', () => {
    const onChange = jest.fn();
    render(<MonthNavigator year={2026} month={8} onChange={onChange} />);

    fireEvent.press(screen.getByText('Próximo mês'));

    expect(onChange).toHaveBeenCalledWith(2026, 9);
  });

  it('crosses back over a year boundary from January', () => {
    const onChange = jest.fn();
    render(<MonthNavigator year={2026} month={1} onChange={onChange} />);

    fireEvent.press(screen.getByText('Mês anterior'));

    expect(onChange).toHaveBeenCalledWith(2025, 12);
  });

  it('crosses forward over a year boundary from December', () => {
    const onChange = jest.fn();
    render(<MonthNavigator year={2026} month={12} onChange={onChange} />);

    fireEvent.press(screen.getByText('Próximo mês'));

    expect(onChange).toHaveBeenCalledWith(2027, 1);
  });

  it('changes nothing on its own, so the screen owns which month is loaded', () => {
    render(<MonthNavigator year={2026} month={8} onChange={jest.fn()} />);

    fireEvent.press(screen.getByText('Próximo mês'));

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });
});

/**
 * The two forms of the same control, chosen by whether the screen has a value per month to show.
 *
 * The absence of a series *is* the information: the three registration screens use this control as a
 * field - which month a launch belongs to - and there is no "value of the month" there to plot. They
 * pass nothing and keep the bar, which is also why every test above still describes the component.
 */
describe('with a series behind it', () => {
  const series = [
    { year: 2026, month: 6, value: 1000 },
    { year: 2026, month: 7, value: 2000 },
    { year: 2026, month: 8, value: 1500 },
    { year: 2026, month: 9, value: 3000 },
    { year: 2026, month: 10, value: 2500 },
  ];

  it('draws the trend instead of the bar', () => {
    render(<MonthNavigator year={2026} month={8} onChange={jest.fn()} series={series} />);

    expect(screen.getByLabelText('Tendência dos meses')).toBeTruthy();
    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
    expect(screen.getByText('R$ 1.500,00')).toBeTruthy();
    expect(screen.getByText('Jun')).toBeTruthy();
  });

  it('reports the month a point was touched on', () => {
    const onChange = jest.fn();
    render(<MonthNavigator year={2026} month={8} onChange={onChange} series={series} />);

    fireEvent.press(screen.getByLabelText('Julho de 2026, R$ 2.000,00'));

    expect(onChange).toHaveBeenCalledWith(2026, 7);
  });

  it('keeps the bar when no series is given', () => {
    render(<MonthNavigator year={2026} month={8} onChange={jest.fn()} />);

    expect(screen.queryByLabelText('Tendência dos meses')).toBeNull();
    expect(screen.getByText('Mês anterior')).toBeTruthy();
  });
});
