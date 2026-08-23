import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorState } from '@/components/states';

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
