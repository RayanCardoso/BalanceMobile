import { render, screen } from '@testing-library/react-native';

import { Loading } from '@/components/states';

describe('Loading', () => {
  it('shows an activity indicator, so a first fetch is never a blank screen', () => {
    render(<Loading />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('shows the label it was given', () => {
    render(<Loading label="Carregando agosto" />);

    expect(screen.getByText('Carregando agosto')).toBeTruthy();
  });
});
