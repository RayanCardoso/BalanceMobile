import { EllipsisVertical } from 'lucide-react-native';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { colors, radius, space, type } from '@/components/theme';

/**
 * O menu de uma linha de lançamento: os três pontinhos e o que dá para fazer com aquela linha.
 *
 * Existe porque Receitas e Despesas pedem exatamente o mesmo desenho — o mesmo ícone, a mesma folha
 * escura de 220pt, o mesmo texto claro — e a segunda cópia daquele bloco de `customStyles` seria a
 * primeira a divergir da outra. Aqui o desenho é decidido uma vez; a tela só diz **o que** a linha
 * dela sabe fazer.
 *
 * As ações vêm como lista e não como campos fixos porque elas dependem do estado da linha: uma
 * conta recorrente já paga oferece corrigir o pagamento, uma que não chegou oferece registrá-lo, e
 * uma opção morta na folha é pior do que uma opção a menos.
 */

export type RowAction = {
  label: string;
  onSelect: () => void;
};

export function RowMenu({
  actions,
  label = 'Ações',
  testID,
}: {
  actions: RowAction[];
  /** O que um leitor de tela anuncia no gatilho. As telas passam o nome da linha junto. */
  label?: string;
  testID?: string;
}): React.JSX.Element {
  return (
    <Menu>
      <MenuTrigger accessibilityLabel={label} accessibilityRole="button" accessible testID={testID}>
        <EllipsisVertical color={colors.text.primary} size={20} />
      </MenuTrigger>

      <MenuOptions customStyles={menuStyles}>
        {actions.map((action) => (
          <MenuOption key={action.label} onSelect={action.onSelect} text={action.label} />
        ))}
      </MenuOptions>
    </Menu>
  );
}

/**
 * Fora do `StyleSheet.create` porque o `react-native-popup-menu` recebe objetos de estilo por
 * `customStyles` e não ids registrados — é o formato que a biblioteca entende.
 */
const menuStyles = {
  optionsContainer: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: space.xs,
    width: 220,
  },
  optionText: {
    ...type.body,
    color: colors.text.primary,
  },
};
