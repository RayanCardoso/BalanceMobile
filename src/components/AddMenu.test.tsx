import { fireEvent, render, screen } from '@testing-library/react-native';
import { Landmark } from 'lucide-react-native';

import { AddMenu, addOptionsFor } from '@/components/AddMenu';

/**
 * `router` é o alvo da asserção: o que interessa provar é para onde cada opção leva, e o `router` do
 * expo-router é justamente a peça que não pode ser exercida de verdade sem um container.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { router } = require('expo-router') as { router: { push: jest.Mock } };

beforeEach(() => {
  router.push.mockClear();
});

describe('o botão de adicionar', () => {
  it('só mostra as opções depois de ser tocado', () => {
    render(<AddMenu />);

    expect(screen.queryByTestId('add-menu-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('add-menu-trigger'));

    expect(screen.getByTestId('add-menu-sheet')).toBeTruthy();
  });

  /**
   * Estes sete são o conjunto inteiro do que dá para criar a partir do resumo. Conta, pessoa e
   * categoria estão aqui porque a fileira de círculos que era a única porta delas deixou de existir.
   */
  it('oferece os quatro lançamentos e os três cadastros', () => {
    render(<AddMenu />);
    fireEvent.press(screen.getByTestId('add-menu-trigger'));

    [
      'Nova receita',
      'Nova despesa variável',
      'Nova despesa recorrente',
      'Novo parcelamento',
      'Nova conta',
      'Nova pessoa',
      'Nova categoria',
    ].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeTruthy();
    });
  });

  it('leva à tela da opção escolhida e fecha a folha', () => {
    render(<AddMenu />);
    fireEvent.press(screen.getByTestId('add-menu-trigger'));
    fireEvent.press(screen.getByLabelText('Nova despesa recorrente'));

    expect(router.push).toHaveBeenCalledWith('/expenses/recurring/new');
    expect(screen.queryByTestId('add-menu-sheet')).toBeNull();
  });

  it('fecha sem escolher quando o escurecido é tocado', () => {
    render(<AddMenu />);
    fireEvent.press(screen.getByTestId('add-menu-trigger'));
    fireEvent.press(screen.getByTestId('add-menu-scrim'));

    expect(screen.queryByTestId('add-menu-sheet')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  /**
   * Com uma opção só não há escolha a fazer, e a folha seria um toque a mais para nada. O botão
   * passa a ser aquela opção — inclusive no nome que um leitor de tela anuncia.
   */
  describe('com um destino só', () => {
    const single = [
      {
        href: '/accounts' as const,
        label: 'Nova conta',
        icon: Landmark,
        group: 'Cadastrar',
        scope: 'catalogue' as const,
      },
    ];

    it('navega direto, sem abrir folha', () => {
      render(<AddMenu options={single} />);
      fireEvent.press(screen.getByTestId('add-menu-trigger'));

      expect(router.push).toHaveBeenCalledWith('/accounts');
      expect(screen.queryByTestId('add-menu-sheet')).toBeNull();
    });

    it('anuncia o destino em vez de "Adicionar"', () => {
      render(<AddMenu options={single} />);

      expect(screen.getByLabelText('Nova conta')).toBeTruthy();
    });
  });
});

/**
 * A fatia por assunto é o que faz uma folha só servir as três telas. Se cada tela declarasse os seus
 * próprios destinos, um destino novo teria de nascer em três lugares - e nasceria em dois.
 */
describe('a fatia por assunto', () => {
  it('mostra só os lançamentos de despesa quando a tela de Despesas pede os dela', () => {
    render(<AddMenu options={addOptionsFor('expense')} />);
    fireEvent.press(screen.getByTestId('add-menu-trigger'));

    ['Nova despesa variável', 'Nova despesa recorrente', 'Novo parcelamento'].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeTruthy();
    });

    ['Nova receita', 'Nova conta', 'Nova pessoa', 'Nova categoria'].forEach((label) => {
      expect(screen.queryByLabelText(label)).toBeNull();
    });
  });

  it('mantém a ordem da lista, e não a ordem em que os assuntos foram pedidos', () => {
    expect(addOptionsFor('catalogue', 'income').map((option) => option.label)).toEqual([
      'Nova receita',
      'Nova conta',
      'Nova pessoa',
      'Nova categoria',
    ]);
  });
});
