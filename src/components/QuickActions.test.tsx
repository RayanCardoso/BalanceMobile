import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickActions } from '@/components/QuickActions';

/**
 * `router` é o alvo da asserção: o que interessa provar é para onde cada círculo leva, e o `router`
 * do expo-router é justamente a peça que não pode ser exercida de verdade sem um container.
 */
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { router } = require('expo-router') as { router: { push: jest.Mock } };

beforeEach(() => {
  router.push.mockClear();
});

describe('os atalhos de cadastro', () => {
  /**
   * Eles existem porque o menu "Catálogo" deixou de existir. Se um destes três links sumir, uma tela
   * de cadastro fica inalcançável — não há outra porta.
   */
  it('alcança conta, pessoa e categoria', () => {
    render(<QuickActions />);

    fireEvent.press(screen.getByLabelText('Nova conta'));
    fireEvent.press(screen.getByLabelText('Nova pessoa'));
    fireEvent.press(screen.getByLabelText('Nova categoria'));

    expect(router.push).toHaveBeenNthCalledWith(1, '/accounts');
    expect(router.push).toHaveBeenNthCalledWith(2, '/people');
    expect(router.push).toHaveBeenNthCalledWith(3, '/categories');
  });

  it('legenda cada um em português', () => {
    render(<QuickActions />);

    expect(screen.getByText('Nova conta')).toBeTruthy();
    expect(screen.getByText('Nova pessoa')).toBeTruthy();
    expect(screen.getByText('Nova categoria')).toBeTruthy();
  });

  /** Sem isto o leitor de tela anunciaria um botão sem nome e a legenda como texto solto ao lado. */
  it('anuncia cada atalho como botão com o seu nome', () => {
    render(<QuickActions />);

    expect(screen.getByLabelText('Nova conta')).toBeTruthy();
    expect(screen.getByLabelText('Nova pessoa')).toBeTruthy();
    expect(screen.getByLabelText('Nova categoria')).toBeTruthy();
  });
});
