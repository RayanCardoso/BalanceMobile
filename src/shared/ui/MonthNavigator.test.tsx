import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthNavigator } from '@/shared/ui/MonthNavigator';

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
