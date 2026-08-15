import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { Field, Picker, SubmitButton } from '@/components/form';

describe('Field', () => {
  it('renders its label', () => {
    render(<Field label="Nome" value="" onChangeText={jest.fn()} />);

    expect(screen.getByText('Nome')).toBeTruthy();
  });

  it("shows the error text it was handed, which is the API's own wording", () => {
    render(
      <Field label="Nome" value="" onChangeText={jest.fn()} error="O nome é obrigatório" />
    );

    expect(screen.getByText('O nome é obrigatório')).toBeTruthy();
  });

  it('shows no error text when there is no error', () => {
    render(<Field label="Nome" value="Mercado" onChangeText={jest.fn()} />);

    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  it('reports what the user typed', () => {
    const onChangeText = jest.fn();
    render(<Field label="Nome" value="" onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText('Nome'), 'Mercado');

    expect(onChangeText).toHaveBeenCalledWith('Mercado');
  });
});

describe('Picker', () => {
  const categories = [
    { label: 'Alimentação', value: 'cat-1' },
    { label: 'Transporte', value: 'cat-2' },
  ];

  it('renders every option', () => {
    render(
      <Picker label="Categoria" options={categories} selected={null} onChange={jest.fn()} />
    );

    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('Transporte')).toBeTruthy();
  });

  it('reports the option that was chosen, not the one that was selected before', () => {
    const onChange = jest.fn();
    render(
      <Picker label="Categoria" options={categories} selected="cat-1" onChange={onChange} />
    );

    fireEvent.press(screen.getByText('Transporte'));

    expect(onChange).toHaveBeenCalledWith('cat-2');
  });

  it('reports a numeric value as a number, so an enum reaches the API as one', () => {
    const onChange = jest.fn();
    render(
      <Picker
        label="Tipo"
        options={[
          { label: 'Crédito', value: 0 },
          { label: 'Débito', value: 1 },
        ]}
        selected={null}
        onChange={onChange}
      />
    );

    fireEvent.press(screen.getByText('Crédito'));

    expect(onChange).toHaveBeenCalledWith(0);
  });
});

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
