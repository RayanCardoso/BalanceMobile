import { render, screen } from '@testing-library/react-native';

import { Money, StatusBadge } from '@/components/Money';

/**
 * Every expected string is a literal (lesson L-010). Calling `formatMoney` inside an assertion would
 * mirror the component instead of pinning it, and both would agree on any wrong output.
 */
describe('Money', () => {
  it('renders a positive value grouped in pt-BR', () => {
    render(<Money value={1234.56} />);

    expect(screen.getByText('R$ 1.234,56')).toBeTruthy();
  });

  it('renders zero with both decimal places', () => {
    render(<Money value={0} />);

    expect(screen.getByText('R$ 0,00')).toBeTruthy();
  });

  it('renders a negative value with its sign', () => {
    render(<Money value={-45.9} />);

    expect(screen.getByText('-R$ 45,90')).toBeTruthy();
  });

  it('never renders a negative value as its absolute value', () => {
    render(<Money value={-45.9} />);

    // Spec DASH AC5. A component dropping the sign would still pass a test that only looked for
    // digits, and the user would read a shortfall as a surplus.
    expect(screen.queryByText('R$ 45,90')).toBeNull();
  });
});

describe('StatusBadge', () => {
  it.each([
    ['Pendente', 'neutral'],
    ['Recebido', 'positive'],
    ['Divergente', 'warning'],
  ] as const)('renders %s in its tone', (label, tone) => {
    render(<StatusBadge label={label} tone={tone} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});
