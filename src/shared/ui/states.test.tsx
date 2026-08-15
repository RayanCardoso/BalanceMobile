import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError, NetworkError, UnauthorizedError } from '@/shared/api/ApiError';
import {
  connectivityMessage,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
} from '@/shared/ui/states';
import { colors } from '@/shared/ui/theme';

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
});

describe('Loading', () => {
  it('shows an activity indicator, so a first fetch is never a blank screen', () => {
    render(<Loading />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows the label it was given', () => {
    render(<Loading label="Carregando agosto" />);

    expect(screen.getByText('Carregando agosto')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('explains what would appear there rather than showing nothing', () => {
    render(<EmptyState message="Nenhuma despesa neste mês" />);

    expect(screen.getByText('Nenhuma despesa neste mês')).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it("shows the message it was given, which is the API's own wording", () => {
    render(<ErrorState message="Não foi possível conectar" onRetry={jest.fn()} />);

    expect(screen.getByText('Não foi possível conectar')).toBeTruthy();
  });

  it('offers a retry action', () => {
    render(<ErrorState message="Algo deu errado" onRetry={jest.fn()} />);

    expect(screen.getByText('Tentar novamente')).toBeTruthy();
  });

  it('calls onRetry when the retry action is pressed', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Algo deu errado" onRetry={onRetry} />);

    fireEvent.press(screen.getByText('Tentar novamente'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

/**
 * Spec UX AC5 - "IF the API is unreachable THEN the system SHALL say so rather than reporting a
 * validation problem". The distinction is the whole criterion, so the failures that are *not*
 * connectivity are asserted to produce nothing here: a helper answering for every error type would
 * relabel a rejected form as an offline device.
 */
describe('connectivityMessage', () => {
  it('says the server could not be reached when fetch itself failed', () => {
    expect(connectivityMessage(new NetworkError())).toBe(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    );
  });

  it("answers for no other failure, so a rejection keeps the API's own words", () => {
    expect(connectivityMessage(new ApiError(['O nome é obrigatório.']))).toBeNull();
    expect(connectivityMessage(new UnauthorizedError(['Sessão expirada.']))).toBeNull();
    expect(connectivityMessage(new Error('Algo deu errado'))).toBeNull();
  });
});
