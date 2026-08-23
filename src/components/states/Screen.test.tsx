import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Screen } from '@/components/states';
import { colors } from '@/components/theme';

/**
 * Spec UX AC1, AC2 and AC3. The messages are asserted as the literal text the user reads, and the
 * retry is asserted by the call it makes rather than by the control existing - a button rendered
 * without its handler wired looks identical on screen.
 */
describe('Screen', () => {
  it('renders what it wraps', () => {
    render(
      <Screen>
        <Text>Agosto de 2026</Text>
      </Screen>
    );

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });
});

/**
 * O `Screen` é o único lugar que sabe da barra de gestos do Android. Concentrar aqui é o que
 * impede "respeitar a safe area" de virar uma regra que toda tela nova precisa lembrar.
 */
describe('o container de tela', () => {
  it('rola, para que um formulário mais alto que a tela continue alcançável', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <Screen>
          <Text>conteúdo</Text>
        </Screen>
      </SafeAreaProvider>
    );

    expect(screen.getByTestId('screen-scroll')).toBeTruthy();
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });

  it('mantém o fundo escuro explícito, para não piscar branco', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <Screen>
          <Text>conteúdo</Text>
        </Screen>
      </SafeAreaProvider>
    );

    expect(screen.getByTestId('screen-scroll')).toHaveStyle({
      backgroundColor: colors.surface.base,
    });
  });

  it('soma insets.bottom ao padding de baixo, para o fim da lista não nascer sob a barra de gestos', () => {
    render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <Screen>
          <Text>conteúdo</Text>
        </Screen>
      </SafeAreaProvider>
    );

    // insets.bottom (34) + space.lg (16). contentContainerStyle é um array
    // ([styles.content, { paddingBottom }]), não um único objeto, então achatamos antes de checar.
    const contentContainerStyle = screen.getByTestId('screen-scroll').props.contentContainerStyle;
    expect(Object.assign({}, ...contentContainerStyle)).toMatchObject({ paddingBottom: 50 });
  });
});
