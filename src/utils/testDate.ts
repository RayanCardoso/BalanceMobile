import { fireEvent, screen } from '@testing-library/react-native';

import { formatBrDate } from '@/utils/dates';

/**
 * Escolhe uma data num `DateField`, como um usuário faria: abre o calendário e confirma.
 *
 * Existe porque a interação tem três passos e um estado global — o `globalThis.__pickDate` que
 * `jest.setup.js` documenta — e repetir isso em cada teste de formulário convidaria a esquecer de
 * limpar a escolha entre um teste e o seguinte.
 *
 * `current` é a data que o campo mostra agora, em `YYYY-MM-DD`: é ela que compõe o rótulo de
 * acessibilidade pelo qual o campo é encontrado.
 */
export function pickDate(label: string, current: string, wanted: string): void {
  fireEvent.press(screen.getByLabelText(`${label}, ${formatBrDate(current)}`));

  (globalThis as { __pickDate?: string | null }).__pickDate = wanted;

  try {
    fireEvent.press(screen.getByTestId('native-picker-set'));
  } finally {
    (globalThis as { __pickDate?: string | null }).__pickDate = null;
  }
}
