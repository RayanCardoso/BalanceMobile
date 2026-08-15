import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthErrors, AuthFrame } from '@/components/AuthFrame';

const renderFrame = (): void => {
  render(
    <AuthFrame footer={<Text>ir para outro lugar</Text>} subtitle="subtítulo" title="título">
      <Text>o formulário</Text>
    </AuthFrame>
  );
};

describe('the auth frame', () => {
  it('shows the mark, the copy it was given, the form and the way out', () => {
    renderFrame();

    // The mark is decorative, so it is hidden from the accessibility tree and the query has to say
    // so. See `Brand.test.tsx`.
    expect(screen.getByTestId('app-icon', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('título')).toBeTruthy();
    expect(screen.getByText('subtítulo')).toBeTruthy();
    expect(screen.getByText('o formulário')).toBeTruthy();
    expect(screen.getByText('ir para outro lugar')).toBeTruthy();
  });
});

describe('the error panel', () => {
  it('renders nothing at all when there is nothing to report', () => {
    render(<AuthErrors messages={[]} />);

    // Not "renders no text": an empty bordered panel sitting above the button on a form that has
    // not been submitted is the defect this rules out.
    expect(screen.queryByTestId('form-error')).toBeNull();
  });

  it('renders every message the API sent, word for word', () => {
    render(<AuthErrors messages={['E-mail já cadastrado.', 'Senha muito curta.']} />);

    expect(screen.getAllByTestId('form-error')).toHaveLength(2);
    expect(screen.getByText('E-mail já cadastrado.')).toBeTruthy();
    expect(screen.getByText('Senha muito curta.')).toBeTruthy();
  });
});
