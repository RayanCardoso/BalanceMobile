import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FieldTrigger } from '@/components/form/FieldTrigger';

const icon = <Text>ícone</Text>;

describe('FieldTrigger', () => {
  it('mostra o rótulo e o valor escolhido', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
  });

  it('mostra o placeholder quando nada foi escolhido', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value={null}
      />
    );

    expect(screen.getByText('Selecionar')).toBeTruthy();
  });

  /**
   * Rótulo e valor numa frase só: sem isto o leitor de tela anuncia um botão chamado "Alimentação",
   * sem dizer de que campo se trata.
   */
  it('anuncia rótulo e valor numa frase só', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.getByLabelText('Categoria, Alimentação')).toBeTruthy();
  });

  it('mostra o erro que recebeu', () => {
    render(
      <FieldTrigger
        error="Escolha uma categoria."
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value={null}
      />
    );

    expect(screen.getByTestId('field-error')).toBeTruthy();
    expect(screen.getByText('Escolha uma categoria.')).toBeTruthy();
  });

  it('não mostra linha de erro quando não há erro', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  it('reporta o toque', () => {
    const onPress = jest.fn();
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={onPress}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Alimentação'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
