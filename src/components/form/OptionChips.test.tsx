import { fireEvent, render, screen } from '@testing-library/react-native';

import { OptionChips } from '@/components/form/OptionChips';

const types = [
  { label: 'Crédito', value: 0 },
  { label: 'Débito', value: 1 },
  { label: 'Pix', value: 2 },
];

describe('OptionChips', () => {
  it('marca a opção escolhida para quem usa leitor de tela', () => {
    render(<OptionChips label="Tipo" onChange={jest.fn()} options={types} selected={1} />);

    expect(screen.getByLabelText('Débito').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Crédito').props.accessibilityState.selected).toBe(false);
  });

  /** Cor nunca é o único sinal: o check é o que sobra para quem não distingue as duas superfícies. */
  it('marca a opção escolhida com um sinal que não é cor', () => {
    render(<OptionChips label="Tipo" onChange={jest.fn()} options={types} selected={1} />);

    expect(screen.getByTestId('chip-check')).toBeTruthy();
  });

  it('reporta o valor da opção tocada', () => {
    const onChange = jest.fn();
    render(<OptionChips label="Tipo" onChange={onChange} options={types} selected={0} />);

    fireEvent.press(screen.getByText('Pix'));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('mostra o erro que recebeu', () => {
    render(
      <OptionChips
        error="Escolha um tipo."
        label="Tipo"
        onChange={jest.fn()}
        options={types}
        selected={null}
      />
    );

    expect(screen.getByTestId('field-error')).toBeTruthy();
    expect(screen.getByText('Escolha um tipo.')).toBeTruthy();
  });

  it('não mostra linha de erro quando não há erro', () => {
    render(<OptionChips label="Tipo" onChange={jest.fn()} options={types} selected={1} />);

    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  it('diz que não há opções em vez de desenhar um vazio', () => {
    render(<OptionChips label="Conta" onChange={jest.fn()} options={[]} selected={null} />);

    expect(screen.getByText('Nenhuma opção disponível.')).toBeTruthy();
  });
});
