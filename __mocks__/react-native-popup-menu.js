/**
 * O dobro de teste do `react-native-popup-menu`, usado automaticamente por estar ao lado de
 * `node_modules` (é como o Jest trata o mock manual de um pacote).
 *
 * O componente real posiciona a folha de opções a partir do `onLayout` do gatilho, e sob o Jest
 * nenhum `onLayout` acontece: o menu abre e não desenha opção nenhuma, então nenhum teste consegue
 * afirmar para onde uma opção leva. Pior, montar um `<Menu>` sem `MenuProvider` lança, o que derruba
 * a tela inteira antes da primeira asserção.
 *
 * Este dobro mantém o contrato que as telas usam - o gatilho abre, a opção escolhida chama o
 * `onSelect` dela e fecha - sem depender de medida de tela. O visual não é responsabilidade dele:
 * `customStyles` é ignorado de propósito, porque estilo é o que o componente real desenha.
 */
const React = require('react');
const { Pressable, Text, View } = require('react-native');

function MenuProvider({ children }) {
  return React.createElement(View, null, children);
}

function MenuTrigger({
  accessibilityLabel,
  accessibilityRole,
  children,
  disabled,
  onPress,
  testID,
  text,
}) {
  return React.createElement(
    Pressable,
    {
      accessibilityLabel,
      accessibilityRole: accessibilityRole ?? 'button',
      disabled,
      onPress,
      testID,
    },
    text === undefined ? children : React.createElement(Text, null, text)
  );
}

function MenuOption({ children, disabled, onSelect, onSelected, testID, text }) {
  return React.createElement(
    Pressable,
    {
      accessibilityLabel: text,
      accessibilityRole: 'button',
      disabled,
      onPress: () => {
        onSelect?.();
        onSelected?.();
      },
      testID,
    },
    text === undefined ? children : React.createElement(Text, null, text)
  );
}

function MenuOptions({ children, onSelected }) {
  return React.createElement(
    View,
    { testID: 'menu-options' },
    React.Children.map(children, (child) =>
      React.isValidElement(child) ? React.cloneElement(child, { onSelected }) : child
    )
  );
}

/** Guarda quem está aberto, que é a única parte do comportamento real que um teste observa. */
function Menu({ children }) {
  const [open, setOpen] = React.useState(false);

  return React.createElement(
    View,
    null,
    React.Children.toArray(children).map((child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      if (child.type === MenuTrigger) {
        return React.cloneElement(child, {
          onPress: () => {
            child.props.onPress?.();
            setOpen(true);
          },
        });
      }

      if (child.type === MenuOptions) {
        return open
          ? React.cloneElement(child, {
              onSelected: () => {
                setOpen(false);
              },
            })
          : null;
      }

      return child;
    })
  );
}

module.exports = { Menu, MenuOption, MenuOptions, MenuProvider, MenuTrigger };
