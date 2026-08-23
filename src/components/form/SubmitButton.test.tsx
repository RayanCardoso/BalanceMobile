import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { SubmitButton } from '@/components/form';

/**
 * Spec UX AC4 - while a mutation is in flight the submit control must be disabled so the request
 * cannot be sent twice. The assertions are on how many times the handler ran, not on the button
 * reporting itself disabled: a control that renders as disabled and still forwards the press looks
 * correct in a snapshot and sends the expense twice.
 */
describe('SubmitButton', () => {
  it('calls its handler on a press when nothing is pending', () => {
    const onPress = jest.fn();
    render(<SubmitButton label="Salvar" pending={false} onPress={onPress} />);

    fireEvent.press(screen.getByText('Salvar'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call its handler while a mutation is pending', () => {
    const onPress = jest.fn();
    render(<SubmitButton label="Salvar" pending onPress={onPress} />);

    fireEvent.press(screen.getByText('Salvar'));
    fireEvent.press(screen.getByText('Salvar'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('submits once when the user presses twice, because the first press makes it pending', () => {
    const submit = jest.fn();

    function Form(): React.JSX.Element {
      const [pending, setPending] = useState(false);

      return (
        <SubmitButton
          label="Salvar"
          pending={pending}
          onPress={() => {
            setPending(true);
            submit();
          }}
        />
      );
    }

    render(<Form />);

    fireEvent.press(screen.getByText('Salvar'));
    fireEvent.press(screen.getByText('Salvar'));

    expect(submit).toHaveBeenCalledTimes(1);
  });
});
