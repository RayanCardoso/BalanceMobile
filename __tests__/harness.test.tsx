import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

/**
 * Proves the runner itself: `jest-expo` transforms TSX, React Native renders under the test
 * environment, and React Native Testing Library's queries reach the rendered tree. Every later test
 * rests on all three, so without this a broken harness would read as a broken feature.
 */
describe('the test harness', () => {
  it('renders a React Native component and finds its text', () => {
    render(<Text>Balance</Text>);

    expect(screen.getByText('Balance')).toBeTruthy();
  });
});
