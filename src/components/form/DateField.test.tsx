import { fireEvent, render, screen } from '@testing-library/react-native';

import { DateField } from '@/components/form';

/**
 * O calendário é substituído por um botão que devolve uma data fixa, e outro que cancela.
 *
 * O que se testa aqui não é o calendário — é o contrato do campo com o resto do app: ele fala
 * `YYYY-MM-DD` para fora, mostra `DD/MM/AAAA` para dentro, e um cancelamento não muda nada. O
 * calendário em si é da biblioteca e não é nosso para testar.
 */
jest.mock('react-native-ui-datepicker', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    useDefaultStyles: () => ({}),
    default: ({ onChange }: { onChange: (params: { date: Date | null }) => void }) =>
      react.createElement(rn.View, { testID: 'native-picker' }, [
        react.createElement(rn.Text, {
          key: 'set',
          testID: 'native-picker-set',
          onPress: () => {
            onChange({ date: new Date(2026, 8, 3) });
          },
        }),
        react.createElement(rn.Text, {
          key: 'dismiss',
          testID: 'native-picker-dismiss',
          onPress: () => {
            onChange({ date: null });
          },
        }),
      ]),
  };
});

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('o que o campo mostra', () => {
  it('mostra a data no formato brasileiro, não no da API', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    expect(screen.getByText('21/08/2026')).toBeTruthy();
    expect(screen.queryByText('2026-08-21')).toBeNull();
  });

  it('anuncia o rótulo e a data escolhida a quem usa leitor de tela', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    expect(screen.getByLabelText('Data do pagamento, 21/08/2026')).toBeTruthy();
  });

  it('mostra o erro que recebeu', () => {
    render(
      <DateField
        error="Data inválida."
        label="Data do pagamento"
        onChange={onChange}
        value="2026-08-21"
      />
    );

    expect(screen.getByTestId('field-error')).toHaveTextContent('Data inválida.');
  });
});

describe('escolher uma data', () => {
  it('só abre o calendário depois do toque', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    expect(screen.queryByTestId('native-picker')).toBeNull();

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));

    expect(screen.getByTestId('native-picker')).toBeTruthy();
  });

  it('devolve a data escolhida no formato da API', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    expect(onChange).toHaveBeenCalledWith('2026-09-03');
  });

  /** Cancelar tem de ser inerte: um formulário que muda de valor ao ser cancelado é uma armadilha. */
  it('não muda nada quando o calendário é cancelado', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-dismiss'));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('o calendário', () => {
  it('só existe depois que o campo é tocado', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    expect(screen.queryByTestId('native-picker')).toBeNull();

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));

    expect(screen.getByTestId('native-picker')).toBeTruthy();
  });

  it('fecha ao escolher uma data', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    expect(onChange).toHaveBeenCalledWith('2026-09-03');
    expect(screen.queryByTestId('native-picker')).toBeNull();
  });

  it('cancelar não muda o valor', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-dismiss'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
