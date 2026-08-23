import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthField } from '@/components/form/MonthField';

/**
 * Cada mês esperado abaixo é um par literal. Calcular um com `shiftMonth` na asserção espelharia o
 * componente e concordaria com ele em qualquer resposta errada (lição L-010).
 */
describe('MonthField', () => {
  it('nomeia o mês que está mostrando, em português', () => {
    render(
      <MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />
    );

    expect(screen.getByLabelText('Mês de competência, Agosto de 2026')).toBeTruthy();
  });

  it('não mostra a grade antes de ser tocado', () => {
    render(
      <MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />
    );

    expect(screen.queryByText('Jan')).toBeNull();
  });

  it('reporta o mês tocado na grade e fecha', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByText('Set'));

    expect(onChange).toHaveBeenCalledWith(2026, 9);
    expect(screen.queryByText('Jan')).toBeNull();
  });

  /**
   * Trocar o ano só muda o que a grade mostra. Se ele escolhesse sozinho, passar por 2025 a caminho
   * de 2024 registraria uma competência em 2025 no caminho.
   */
  it('avança o ano sem escolher nada', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Próximo ano'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('2027')).toBeTruthy();
  });

  it('escolhe um mês do ano para o qual a grade foi movida', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Ano anterior'));
    fireEvent.press(screen.getByText('Fev'));

    expect(onChange).toHaveBeenCalledWith(2025, 2);
  });

  it('recomeça no ano do valor a cada abertura', () => {
    render(<MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Próximo ano'));
    fireEvent.press(screen.getByLabelText('Fechar'));
    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));

    expect(screen.getByText('2026')).toBeTruthy();
  });
});
