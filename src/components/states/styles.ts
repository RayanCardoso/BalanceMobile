import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * Os estilos das quatro coisas que uma tela pode estar mostrando. Ficam juntos, e não um pedaço em
 * cada arquivo, porque `centered` e `message` são literalmente os mesmos três estados e uma cópia
 * por arquivo seria três lugares para ajustar o mesmo respiro.
 */
export const stateStyles = StyleSheet.create({
  /** Usado direto por `Loading`, que não passa por `KeyboardAvoidingView` nem `ScrollView`. */
  screen: {
    backgroundColor: colors.surface.base,
    flex: 1,
    padding: space.lg,
  },
  /**
   * Sem `padding`: no iOS, `KeyboardAvoidingView` com `behavior="padding"` compõe o seu próprio
   * `paddingBottom` (a altura do teclado, 0 quando fechado) por cima do `style` recebido, e isso
   * zera qualquer `paddingBottom` vindo daqui sempre que o teclado está fechado - a maior parte do
   * tempo. `content` abaixo é por isso a única fonte da borda.
   */
  avoidingView: {
    backgroundColor: colors.surface.base,
    flex: 1,
  },
  /**
   * Mesmo motivo de `avoidingView`: sem `padding` aqui, só `flex` para o `ScrollView` ocupar o
   * espaço do pai. `backgroundColor` fica porque o teste consulta o próprio `ScrollView`
   * (`screen-scroll`), não o `KeyboardAvoidingView` que o envolve.
   */
  scroll: {
    backgroundColor: colors.surface.base,
    flex: 1,
  },
  /**
   * `flexGrow` e não `flex`: um `flex: 1` prenderia o conteúdo à altura da viewport e a rolagem
   * deixaria de acontecer justamente quando passa a ser necessária. `padding: space.lg` nas quatro
   * bordas é agora a única fonte de borda da tela - `screen` deixou de fornecer a de baixo, que o
   * `KeyboardAvoidingView` zerava no iOS (ver `avoidingView` acima).
   */
  content: {
    flexGrow: 1,
    padding: space.lg,
  },
  /**
   * `right` e não `alignItems`: o container é posicionado, então ele encosta na borda direita sem
   * esticar por cima da tela inteira e sem interceptar toques que eram da lista.
   */
  floating: {
    position: 'absolute',
    right: space.lg,
  },
  centered: {
    alignItems: 'center',
    gap: space.md,
    justifyContent: 'center',
    padding: space.xl,
  },
  message: {
    ...type.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retry: {
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  retryLabel: {
    ...type.label,
    color: colors.accent.text,
  },
});
