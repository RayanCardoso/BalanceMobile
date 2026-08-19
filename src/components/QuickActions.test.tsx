import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { QuickActions } from '@/components/QuickActions';

/** `Link` vira uma `View` com o `href` como `testID`, o mesmo substituto de `AppDrawer.test.tsx`. */
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Link = ({ href, children }: { href: string; children: ReactNode }) =>
    react.createElement(rn.View, { testID: `link-${href}` }, children);

  return { Link };
});

describe('os atalhos de cadastro', () => {
  /**
   * Eles existem porque o menu "Catálogo" deixou de existir. Se um destes três links sumir, uma tela
   * de cadastro fica inalcançável — não há outra porta.
   */
  it('alcança conta, pessoa e categoria', () => {
    render(<QuickActions />);

    expect(screen.getByTestId('link-/accounts')).toBeTruthy();
    expect(screen.getByTestId('link-/people')).toBeTruthy();
    expect(screen.getByTestId('link-/categories')).toBeTruthy();
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
