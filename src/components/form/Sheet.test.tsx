import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from '@/components/form/Sheet';

/**
 * O `Sheet` não decide nada: quem o abre e quem o fecha é sempre quem o usa. O que se testa aqui é
 * que ele obedece — e que fechar tem dois caminhos, porque um modal que só fecha por um botãozinho
 * no canto é um modal que prende o usuário quando o botão sai da tela.
 */
describe('Sheet', () => {
  it('não monta o conteúdo enquanto está fechado', () => {
    render(
      <Sheet onClose={jest.fn()} title="Categoria" visible={false}>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.queryByText('Alimentação')).toBeNull();
  });

  it('mostra o título e o conteúdo quando está aberto', () => {
    render(
      <Sheet onClose={jest.fn()} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
  });

  it('mostra o subtítulo quando recebe um', () => {
    render(
      <Sheet onClose={jest.fn()} subtitle="Agosto de 2026" title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });

  it('fecha pelo botão do canto', () => {
    const onClose = jest.fn();
    render(
      <Sheet onClose={onClose} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    fireEvent.press(screen.getByLabelText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha ao tocar fora da folha', () => {
    const onClose = jest.fn();
    render(
      <Sheet onClose={onClose} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    fireEvent.press(screen.getByLabelText('Fechar Categoria sem escolher'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha ao tocar fora quando quem abre pede para não fechar', () => {
    const onClose = jest.fn();
    render(
      <Sheet closeOnScrim={false} onClose={onClose} title="Registrar recebimento" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.queryByLabelText('Fechar Registrar recebimento sem escolher')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('continua fechando pelo botão do canto mesmo assim', () => {
    const onClose = jest.fn();
    render(
      <Sheet closeOnScrim={false} onClose={onClose} title="Registrar recebimento" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    fireEvent.press(screen.getByLabelText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
