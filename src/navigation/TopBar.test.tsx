import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopBar } from '@/navigation/TopBar';

/**
 * A barra decide sozinha qual controle mostrar, e é isso que faz nenhuma tela precisar saber em
 * que profundidade está. As duas asserções negativas importam tanto quanto as positivas: mostrar
 * os dois controles ao mesmo tempo é o defeito que o design descartou.
 */
describe('o controle que a barra mostra', () => {
  it('mostra voltar, e não o menu, quando há para onde voltar', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onBack={jest.fn()} onMenu={jest.fn()} title="Nova despesa" />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('top-bar-back')).toBeTruthy();
    expect(screen.queryByTestId('top-bar-menu')).toBeNull();
  });

  it('mostra o menu, e não voltar, quando é a raiz do destino', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onMenu={jest.fn()} title="Despesas" />
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('top-bar-menu')).toBeTruthy();
    expect(screen.queryByTestId('top-bar-back')).toBeNull();
  });

  it('chama onBack ao tocar em voltar', () => {
    const onBack = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onBack={onBack} onMenu={jest.fn()} title="Nova despesa" />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('top-bar-back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('chama onMenu ao tocar no menu', () => {
    const onMenu = jest.fn();
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onMenu={onMenu} title="Despesas" />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('mostra o título recebido', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onMenu={jest.fn()} title="Pagamento de conta recorrente" />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Pagamento de conta recorrente')).toBeTruthy();
  });

  it('soma insets.top ao padding da barra, para o título não nascer debaixo do relógio', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <TopBar onMenu={jest.fn()} title="Despesas" />
      </SafeAreaProvider>,
    );

    // insets.top (47) + space.sm (8). Two levels up from the title Text: past the Text host
    // element's own composite wrapper to the bar's outer View, which carries the padding.
    expect(screen.getByTestId('top-bar-title').parent?.parent).toHaveStyle({ paddingTop: 55 });
  });
});
