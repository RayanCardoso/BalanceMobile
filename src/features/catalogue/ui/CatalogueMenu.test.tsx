import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CatalogueMenu } from '@/features/catalogue/ui/CatalogueMenu';

/**
 * `Link` is mocked to a `Text` carrying its `href` as `testID`, the same stand-in style
 * `RootLayout.test.tsx` uses for `Stack`: enough to prove which route each item targets, without a
 * real navigation container.
 */
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Link = ({ href, children }: { href: string; children: ReactNode }) =>
    react.createElement(rn.Text, { testID: `link-${href}` }, children);

  return { Link };
});

describe('the catalogue menu', () => {
  it('reaches all three destinations', () => {
    render(<CatalogueMenu />);

    // Spec CAT-01: each of the three catalogue screens is reachable from here.
    expect(screen.getByTestId('link-/catalogue/people')).toBeTruthy();
    expect(screen.getByTestId('link-/catalogue/categories')).toBeTruthy();
    expect(screen.getByTestId('link-/catalogue/accounts')).toBeTruthy();
  });

  it('labels each destination in Portuguese', () => {
    render(<CatalogueMenu />);

    expect(screen.getByText('Pessoas')).toBeTruthy();
    expect(screen.getByText('Categorias')).toBeTruthy();
    expect(screen.getByText('Contas')).toBeTruthy();
  });
});
