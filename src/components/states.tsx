import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetworkError } from '@/services/ApiError';
import { colors, control, radius, space, type } from '@/components/theme';

/**
 * The four things a screen can be showing. Every list screen is built from these, which is what
 * makes UX-01 structural instead of something each screen has to remember: a screen that forgot its
 * empty state would have nothing to render at all.
 *
 * `ErrorState` takes its message from the caller. The API's own pt-BR copy is what reaches it
 * (MAD-004), so no wording is stored here - with the single exception below, which exists precisely
 * because the API said nothing.
 */

/**
 * Spec UX AC5 - "IF the API is unreachable THEN the system SHALL say so rather than reporting a
 * validation problem".
 *
 * This is the one user-facing sentence the API did not write, and it does not contradict MAD-004:
 * MAD-004 governs what the API *sent*, and a `NetworkError` means the request never arrived, so
 * there is nothing to be faithful to. Every other failure still shows the server's own words.
 *
 * It lives here once rather than in each feature's `errors.ts`. Those are deliberately separate
 * copies so no feature can retitle another's *API* messages; connectivity is not a feature's
 * message at all - it is the same fact about the device on every screen.
 */
export const CONNECTIVITY_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

/** The connectivity message when `fetch` itself failed, and null for every other failure. */
export function connectivityMessage(error: unknown): string | null {
  return error instanceof NetworkError ? CONNECTIVITY_MESSAGE : null;
}

/**
 * O container de toda tela assinada, e o único lugar que trata as bordas do sistema.
 *
 * O Expo SDK 57 liga edge-to-edge no Android por padrão, então sem `insets.bottom` o fim de uma
 * lista nasce debaixo da barra de gestos. A parte de cima é do `TopBar`; daqui para baixo é aqui.
 *
 * Rola por padrão porque a alternativa é cada tela de formulário descobrir sozinha, uma de cada
 * vez, que não cabe num aparelho menor.
 *
 * `floating` é o que fica *por cima* da rolagem — hoje só o botão de adicionar do resumo. Ele é
 * irmão do `ScrollView`, e não filho: um filho rolaria junto com a lista e deixaria de ser um botão
 * flutuante. Quando existe, a borda de baixo do conteúdo cresce o tamanho dele, senão o último
 * cartão da tela nasce debaixo do botão e nunca é alcançável por rolagem.
 */
export function Screen({
  children,
  floating,
}: {
  children: ReactNode;
  floating?: ReactNode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const reserved = floating === undefined ? 0 : control.fab + space.lg;

  return (
    <KeyboardAvoidingView
      // No Android o `windowSoftInputMode` já redimensiona a janela; no iOS não há equivalente.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.avoidingView}
    >
      <ScrollView
        // `content` já tem `space.lg` nas quatro bordas; somar `insets.bottom` aqui é a barra de
        // gestos do Android por cima dessa borda, não no lugar dela.
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.lg + reserved },
        ]}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        testID="screen-scroll"
      >
        {children}
      </ScrollView>

      {floating === undefined ? null : (
        <View style={[styles.floating, { bottom: insets.bottom + space.lg }]}>{floating}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }): React.JSX.Element {
  return (
    <View style={[styles.screen, styles.centered]}>
      <ActivityIndicator color={colors.accent.base} testID="loading-indicator" />
      <Text style={styles.message}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryLabel}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
