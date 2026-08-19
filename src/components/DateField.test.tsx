import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateField } from '@/components/DateField';

/**
 * O picker nativo é substituído por um botão que devolve uma data fixa, e outro que cancela.
 *
 * O que se testa aqui não é o calendário — é o contrato do campo com o resto do app: ele fala
 * `YYYY-MM-DD` para fora, mostra `DD/MM/AAAA` para dentro, e um cancelamento não muda nada. O
 * calendário em si é do sistema operacional e não é nosso para testar.
 */
jest.mock('@react-native-community/datetimepicker', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({
      onChange,
    }: {
      onChange: (event: { type: string }, date?: Date) => void;
    }) =>
      react.createElement(rn.View, { testID: 'native-picker' }, [
        react.createElement(rn.Text, {
          key: 'set',
          testID: 'native-picker-set',
          onPress: () => {
            onChange({ type: 'set' }, new Date(2026, 8, 3));
          },
        }),
        react.createElement(rn.Text, {
          key: 'dismiss',
          testID: 'native-picker-dismiss',
          onPress: () => {
            onChange({ type: 'dismissed' }, undefined);
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

/**
 * As duas plataformas fecham o calendário de formas diferentes, e o componente não finge o
 * contrário — por isso cada uma tem o seu bloco, com o `Platform.OS` declarado em vez de herdado do
 * padrão do jest-expo, que é iOS.
 */
describe('no Android, onde o diálogo é do sistema', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  it('fecha o calendário assim que a data é escolhida', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    expect(screen.queryByTestId('native-picker')).toBeNull();
  });

  it('fecha o calendário ao cancelar, sem mudar o valor', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-dismiss'));

    expect(screen.queryByTestId('native-picker')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('não desenha a folha de concluir, que é só do iOS', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));

    expect(screen.queryByText('Concluir')).toBeNull();
  });
});

describe('no iOS, onde o picker é inline e não se fecha sozinho', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  /**
   * Sem a folha e o "Concluir", o calendário do iOS fica preso aberto no meio do formulário: o
   * componente é desenhado na tela, e não num diálogo que o sistema retira.
   */
  it('desenha uma folha com botão de concluir', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));

    expect(screen.getByText('Concluir')).toBeTruthy();
  });

  it('mantém o calendário aberto depois da escolha, para poder trocar de ideia', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    expect(onChange).toHaveBeenCalledWith('2026-09-03');
    expect(screen.getByTestId('native-picker')).toBeTruthy();
  });

  it('fecha no Concluir', () => {
    render(<DateField label="Data do pagamento" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data do pagamento, 21/08/2026'));
    fireEvent.press(screen.getByText('Concluir'));

    expect(screen.queryByTestId('native-picker')).toBeNull();
  });
});
