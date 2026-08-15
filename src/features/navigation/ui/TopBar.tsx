import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, control, space, type } from '@/shared/ui/theme';

/**
 * A barra superior de todas as telas assinadas, e a única peça que sabe qual controle cada uma
 * merece: `←` quando a tela foi empilhada sobre outra, `☰` quando ela é a raiz de um destino.
 *
 * A decisão vive aqui em vez de em cada tela porque é sempre a mesma decisão. Quem monta a barra
 * passa `onBack` apenas quando existe para onde voltar, e a ausência da prop é o sinal.
 *
 * `insets.top` é o motivo de esta barra existir como componente e não como opção de header: o
 * Expo SDK 57 liga edge-to-edge no Android, então sem este `paddingTop` o título nasce debaixo do
 * relógio e da bateria.
 */
export function TopBar({
  title,
  onBack,
  onMenu,
}: {
  title: string;
  /** Quando definido, a barra mostra voltar no lugar do menu. */
  onBack?: () => void;
  onMenu: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
      {onBack === undefined ? (
        <Pressable
          accessibilityLabel="Abrir menu"
          accessibilityRole="button"
          onPress={onMenu}
          style={styles.control}
          testID="top-bar-menu"
        >
          {/* Três traços em vez de um ícone: o projeto não tem fonte de ícones, e dois glifos não
              justificam uma dependência. */}
          <View style={styles.rule} />
          <View style={styles.rule} />
          <View style={styles.rule} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.control}
          testID="top-bar-back"
        >
          <Text style={styles.arrow}>←</Text>
        </Pressable>
      )}

      {/* Uma linha só: "Pagamento de conta recorrente" não cabe em telas estreitas. */}
      <Text numberOfLines={1} style={styles.title} testID="top-bar-title">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingBottom: space.sm,
    paddingHorizontal: space.sm,
  },
  control: {
    alignItems: 'center',
    gap: space.xs,
    height: control.size,
    justifyContent: 'center',
    width: control.size,
  },
  rule: {
    backgroundColor: colors.text.primary,
    height: control.bar,
    width: space.xl,
  },
  arrow: {
    ...type.title,
    color: colors.text.primary,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
    flexShrink: 1,
  },
});
