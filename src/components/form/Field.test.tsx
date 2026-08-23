import { fireEvent, render, screen } from '@testing-library/react-native';

import { Field } from '@/components/form';

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
