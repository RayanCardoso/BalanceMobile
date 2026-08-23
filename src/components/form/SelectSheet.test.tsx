import { fireEvent, render, screen } from '@testing-library/react-native';

import { SelectSheet } from '@/components/form/SelectSheet';

const nine = [
  { label: 'Alimentação', value: 'c1' },
  { label: 'Transporte', value: 'c2' },
  { label: 'Moradia', value: 'c3' },
  { label: 'Saúde', value: 'c4' },
  { label: 'Educação', value: 'c5' },
  { label: 'Lazer', value: 'c6' },
  { label: 'Vestuário', value: 'c7' },
  { label: 'Assinaturas', value: 'c8' },
  { label: 'Pets', value: 'c9' },
];

describe('a busca', () => {
  it('não aparece enquanto a lista cabe na cabeça de quem lê', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine.slice(0, 8)}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));

    expect(screen.queryByLabelText('Buscar')).toBeNull();
  });

  it('filtra ignorando acento e caixa', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'saude');

    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.queryByText('Alimentação')).toBeNull();
  });

  it('diz quando a busca não achou nada, em vez de mostrar uma folha vazia', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'zzz');

    expect(screen.getByText('Nenhuma opção com esse nome.')).toBeTruthy();
  });

  it('recomeça limpa a cada abertura', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'saude');
    fireEvent.press(screen.getByLabelText('Fechar'));
    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));

    expect(screen.getByText('Alimentação')).toBeTruthy();
  });
});
