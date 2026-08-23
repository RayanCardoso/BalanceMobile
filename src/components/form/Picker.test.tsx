import { fireEvent, render, screen } from '@testing-library/react-native';

import { Picker } from '@/components/form';

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
