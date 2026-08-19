import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import DashboardRoute from '../../app/(app)/index';

import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { AppNavigator } from '@/navigation/AppNavigator';

/**
 * `Drawer` renderiza os filhos e cada `Drawer.Screen` vira um `View` carregando o seu `name` como
 * `testID` — o mesmo estilo de substituto que `CatalogueScreen.test.tsx` usa. Suficiente para provar
 * quais destinos o navegador declara, sem um container de navegação.
 *
 * O conteúdo da gaveta e o Sair são cobertos por `AppDrawer.test.tsx`, que é onde eles moram.
 */
jest.mock('expo-router/drawer', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Drawer = ({ children }: { children?: ReactNode }) =>
    react.createElement(rn.View, { testID: 'app-drawer' }, children);

  Drawer.Screen = ({ name }: { name: string }) =>
    react.createElement(rn.View, { testID: `screen-${name}` });

  return { Drawer };
});

describe('os destinos que o navegador declara (spec DASH AC1)', () => {
  it('declara resumo, receitas, despesas e as três telas de cadastro', () => {
    render(<AppNavigator />);

    expect(screen.getByTestId('screen-index')).toBeTruthy();
    expect(screen.getByTestId('screen-income')).toBeTruthy();
    expect(screen.getByTestId('screen-expenses')).toBeTruthy();
    expect(screen.getByTestId('screen-people')).toBeTruthy();
    expect(screen.getByTestId('screen-categories')).toBeTruthy();
    expect(screen.getByTestId('screen-accounts')).toBeTruthy();
  });

  /**
   * As três telas de cadastro são declaradas aqui porque toda pasta sob `(app)` é uma tela do
   * Drawer — mas não aparecem no menu, que desenha apenas a constante `DESTINATIONS` do `AppDrawer`.
   * Chega-se a elas pelos atalhos do resumo.
   */
  it('não declara mais um destino de catálogo', () => {
    render(<AppNavigator />);

    expect(screen.queryByTestId('screen-catalogue')).toBeNull();
  });

  /**
   * O dashboard é o índice do grupo, então `/` resolve para ele e é onde um usuário assinado cai
   * quando a guarda raiz monta `(app)`. Asserir o export do próprio módulo de rota é a prova
   * disponível sem um container de navegação.
   */
  it('monta o dashboard como rota índice do grupo assinado', () => {
    expect(DashboardRoute).toBe(DashboardScreen);
  });
});
