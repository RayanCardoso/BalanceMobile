import { render, screen } from '@testing-library/react-native';

import { AppIcon, BrandHeader } from '@/shared/ui/Brand';

/**
 * The mark is deliberately hidden from the accessibility tree, and the library's queries skip
 * hidden elements by default - so every lookup of it has to opt back in. Finding it *without* this
 * flag would mean the mark had stopped being decorative.
 */
const markElement = (): ReturnType<typeof screen.getByTestId> =>
  screen.getByTestId('app-icon', { includeHiddenElements: true });

describe('the app mark', () => {
  it('renders the launcher icon asset itself', () => {
    render(<AppIcon />);

    // The assertion is on the source, not on something being drawn: the point of this component is
    // that the screen shows the *same* file the launcher icon is built from, so a copy of the mark
    // pasted into the app would be the failure it catches.
    expect(markElement().props.source).toBe(require('@/assets/images/icon.png') as unknown);
  });

  it('is hidden from screen readers, since the wordmark next to it already says the name', () => {
    render(<BrandHeader tagline="Suas finanças em equilíbrio." />);

    expect(screen.queryByTestId('app-icon')).toBeNull();
    expect(markElement().props.accessibilityElementsHidden).toBe(true);
    expect(screen.getByText('Balance')).toBeTruthy();
  });

  it('shows the tagline it was handed', () => {
    render(<BrandHeader tagline="Suas finanças em equilíbrio." />);

    expect(screen.getByText('Suas finanças em equilíbrio.')).toBeTruthy();
  });
});
