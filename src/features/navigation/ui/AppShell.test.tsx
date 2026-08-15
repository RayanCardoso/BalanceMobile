import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import DashboardRoute from '../../../../app/(app)/index';

import { DashboardScreen } from '@/features/dashboard/ui/DashboardScreen';
import { AppShell } from '@/features/navigation/ui/AppShell';

/**
 * `Drawer` renderiza os filhos e cada `Drawer.Screen` vira um `View` carregando o seu `name` como
 * `testID` — o mesmo estilo de substituto que `CatalogueMenu.test.tsx` usa. Suficiente para provar
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
  it('declara resumo, receitas, despesas, recorrentes e catálogo', () => {
    render(<AppShell />);

    expect(screen.getByTestId('screen-index')).toBeTruthy();
    expect(screen.getByTestId('screen-income')).toBeTruthy();
    expect(screen.getByTestId('screen-expenses')).toBeTruthy();
    expect(screen.getByTestId('screen-recurring')).toBeTruthy();
    expect(screen.getByTestId('screen-catalogue')).toBeTruthy();
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
