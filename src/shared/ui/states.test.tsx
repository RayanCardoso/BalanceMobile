import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';

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
