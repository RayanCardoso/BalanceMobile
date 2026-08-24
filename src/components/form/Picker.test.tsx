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

const five = [
  { label: 'Alimentação', value: 'c1' },
  { label: 'Transporte', value: 'c2' },
  { label: 'Moradia', value: 'c3' },
  { label: 'Saúde', value: 'c4' },
  { label: 'Educação', value: 'c5' },
];

/**
 * Quem escolhe a forma é o componente, pelo tamanho de `options` — as telas nunca escolhem, só
 * dizem que dados têm. É o que impede uma tela de passar a saber de layout.
 */
describe('a forma que o Picker toma', () => {
  it('desenha as opções direto quando são quatro ou menos', () => {
    render(
      <Picker
        label="Tipo"
        onChange={jest.fn()}
        options={five.slice(0, 4)}
        selected={null}
      />
    );

    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.queryByLabelText('Tipo, Selecionar')).toBeNull();
  });

  it('esconde as opções atrás de um campo quando são mais de quatro', () => {
    render(<Picker label="Categoria" onChange={jest.fn()} options={five} selected={null} />);

    expect(screen.queryByText('Educação')).toBeNull();
    expect(screen.getByLabelText('Categoria, Selecionar')).toBeTruthy();
  });

  it('mostra no campo o rótulo da opção escolhida, não o seu valor', () => {
    render(<Picker label="Categoria" onChange={jest.fn()} options={five} selected="c3" />);

    expect(screen.getByLabelText('Categoria, Moradia')).toBeTruthy();
  });

  it('escolhe pela lista e fecha', () => {
    const onChange = jest.fn();
    render(<Picker label="Categoria" onChange={onChange} options={five} selected={null} />);

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.press(screen.getByText('Educação'));

    expect(onChange).toHaveBeenCalledWith('c5');
    expect(screen.queryByText('Educação')).toBeNull();
  });

  it('mostra o erro também quando desenha os chips', () => {
    render(
      <Picker
        error="Escolha uma categoria."
        label="Categoria"
        onChange={jest.fn()}
        options={five.slice(0, 4)}
        selected={null}
      />
    );

    expect(screen.getByText('Escolha uma categoria.')).toBeTruthy();
  });
});
