import { render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/states';

describe('EmptyState', () => {
  it('explains what would appear there rather than showing nothing', () => {
    render(<EmptyState message="Nenhuma despesa neste mês" />);

    expect(screen.getByText('Nenhuma despesa neste mês')).toBeTruthy();
  });
});
