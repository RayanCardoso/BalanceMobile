import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/components/theme';

import { stateStyles } from './styles';

/**
 * O container de toda tela assinada, e o único lugar que trata as bordas do sistema.
 *
 * O Expo SDK 57 liga edge-to-edge no Android por padrão, então sem `insets.bottom` o fim de uma
 * lista nasce debaixo da barra de gestos. A parte de cima é do `TopBar`; daqui para baixo é aqui.
 *
 * Rola por padrão porque a alternativa é cada tela de formulário descobrir sozinha, uma de cada
 * vez, que não cabe num aparelho menor.
 */
export function Screen({ children }: { children: ReactNode }): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      // No Android o `windowSoftInputMode` já redimensiona a janela; no iOS não há equivalente.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={stateStyles.avoidingView}
    >
      <ScrollView
        // `content` já tem `space.lg` nas quatro bordas; somar `insets.bottom` aqui é a barra de
        // gestos do Android por cima dessa borda, não no lugar dela.
        contentContainerStyle={[stateStyles.content, { paddingBottom: insets.bottom + space.lg }]}
        keyboardShouldPersistTaps="handled"
        style={stateStyles.scroll}
        testID="screen-scroll"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
