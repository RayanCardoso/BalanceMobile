import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * A sobreposição de todo campo que se escolhe em vez de digitar.
 *
 * Data, seleção em lista e mês de competência são o mesmo controle — um campo que abre — e antes
 * desta peça eram três desenhos diferentes, escritos em três momentos. O `Sheet` é a metade de fora
 * desse controle: escurecido, folha encostada no rodapé, cabeçalho, e o conteúdo rolando dentro.
 *
 * **Não decide nada.** Quem abre e quem fecha é sempre quem o usa; o `Sheet` só reporta os dois
 * gestos de fechar que existem. O toque no escurecido é um deles porque um modal que só fecha por um
 * alvo de 32pt no canto prende o usuário no primeiro momento em que esse alvo sai da tela.
 *
 * `visible={false}` desmonta o conteúdo (`children` não é renderizado), e não só o esconde: um
 * formulário montado atrás de um modal fechado guarda o estado da abertura anterior.
 */
export function Sheet({
  title,
  subtitle,
  visible,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}): React.JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.scrim}>
        {/* O escurecido é o mesmo da gaveta: é a mesma ideia de "a tela continua ali atrás". */}
        <Pressable
          accessibilityLabel={`Fechar ${title} sem escolher`}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.sheet} testID="sheet">
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              {subtitle === undefined ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <X color={colors.text.secondary} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** A folha encosta no rodapé; o escurecido ocupa o resto e mantém a tela visível atrás. */
  scrim: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.base,
    borderColor: colors.border.subtle,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    // Teto, não altura: uma grade de doze meses não precisa da tela inteira, e o `ScrollView`
    // interno cuida do caso em que a lista é longa.
    maxHeight: '85%',
    paddingTop: space.lg,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
  heading: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.caption,
    color: colors.text.secondary,
  },
  close: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: space.xxl,
    justifyContent: 'center',
    width: space.xxl,
  },
  body: {
    padding: space.lg,
  },
});
