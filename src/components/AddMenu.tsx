import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarClock,
  Coins,
  CreditCard,
  Landmark,
  Plus,
  ShoppingBag,
  Tags,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { colors, control, radius, space, type } from '@/components/theme';

/**
 * O botão de adicionar do resumo, e a folha que ele abre.
 *
 * Ele substituiu a fileira de três círculos (`QuickActions`), e por isso carrega os cadastros de
 * conta, pessoa e categoria junto com os lançamentos: aqueles três círculos eram a única porta para
 * essas telas, e um botão que tirasse a fileira sem levar os destinos junto deixaria três rotas
 * inalcançáveis. Adicionar é uma coisa só — o que muda é o que se está adicionando.
 *
 * **Um destino não abre folha.** Com uma opção só, a folha seria um toque a mais para uma escolha
 * que não existe, então o botão navega direto. É a razão de `options` ser uma lista e não sete
 * campos: a decisão de mostrar ou não a folha é lida da lista, não escrita à mão.
 *
 * Navega por `router.push` e não por `<Link asChild>` — o `asChild` envolve o filho num Slot que só
 * monta sob um container de navegação, e este botão é renderizado sozinho em teste, como o
 * `AccountCard` e os círculos que ele substituiu já faziam.
 */

export type AddOption = {
  href: Href;
  label: string;
  icon: LucideIcon;
  /** O título da seção em que a opção aparece. Opções do mesmo grupo ficam juntas, na ordem daqui. */
  group: string;
};

/**
 * O que dá para criar a partir do resumo.
 *
 * Os rótulos são os mesmos que as telas de Receitas e Despesas já usam nos seus próprios botões —
 * "Nova despesa variável" aqui e lá, e não "Despesa variável" num lugar e "Nova despesa" no outro.
 */
export const ADD_OPTIONS: AddOption[] = [
  { href: '/income/new', label: 'Nova receita', icon: Coins, group: 'Lançar' },
  {
    href: '/expenses/variable/new',
    label: 'Nova despesa variável',
    icon: ShoppingBag,
    group: 'Lançar',
  },
  {
    href: '/expenses/recurring/new',
    label: 'Nova despesa recorrente',
    icon: CalendarClock,
    group: 'Lançar',
  },
  {
    href: '/expenses/variable/installment-plan',
    label: 'Novo parcelamento',
    icon: CreditCard,
    group: 'Lançar',
  },
  { href: '/accounts', label: 'Nova conta', icon: Landmark, group: 'Cadastrar' },
  { href: '/people', label: 'Nova pessoa', icon: UserPlus, group: 'Cadastrar' },
  { href: '/categories', label: 'Nova categoria', icon: Tags, group: 'Cadastrar' },
];

/** Os grupos na ordem em que aparecem na lista, sem repetir nenhum. */
const groupsOf = (options: AddOption[]): string[] => [
  ...new Set(options.map((option) => option.group)),
];

export function AddMenu({ options = ADD_OPTIONS }: { options?: AddOption[] }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const only = options.length === 1 ? options[0] : undefined;

  const go = (href: Href) => (): void => {
    setOpen(false);
    router.push(href);
  };

  return (
    <View>
      <Pressable
        accessibilityLabel={only === undefined ? 'Adicionar' : only.label}
        accessibilityRole="button"
        onPress={
          only === undefined
            ? () => {
                setOpen(true);
              }
            : go(only.href)
        }
        style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
        testID="add-menu-trigger"
      >
        <Plus color={colors.text.onAccent} size={24} strokeWidth={2} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
        }}
        transparent
        visible={open}
      >
        {/* O escurecido é o alvo de "fechar sem escolher", que é o gesto que todo mundo tenta antes
            de procurar um X. O X existe assim mesmo, para quem usa leitor de tela. */}
        <Pressable
          accessibilityLabel="Fechar"
          accessibilityRole="button"
          onPress={() => {
            setOpen(false);
          }}
          style={styles.scrim}
          testID="add-menu-scrim"
        />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}
          testID="add-menu-sheet"
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Adicionar</Text>

            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
              }}
              style={styles.close}
            >
              <X color={colors.text.secondary} size={20} />
            </Pressable>
          </View>

          {groupsOf(options).map((group) => (
            <View key={group} style={styles.group}>
              <Text style={styles.groupTitle}>{group}</Text>

              <View style={styles.optionList}>
                {options
                  .filter((option) => option.group === group)
                  .map(({ href, label, icon: Icon }, index) => (
                    <View key={label}>
                      {/* A régua separa, mas não nasce antes da primeira linha do grupo. */}
                      {index === 0 ? null : <View style={styles.rule} />}

                      <Pressable
                        accessibilityLabel={label}
                        accessibilityRole="button"
                        onPress={go(href)}
                        style={({ pressed }) => [
                          styles.option,
                          pressed ? styles.optionPressed : null,
                        ]}
                      >
                        <View style={styles.optionIcon}>
                          <Icon color={colors.text.secondary} size={18} />
                        </View>

                        <Text style={styles.optionLabel}>{label}</Text>
                      </Pressable>
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * O raio é o próprio `control.fab`: qualquer valor maior ou igual à metade do lado desenha um
   * círculo, e usar a medida do lado mantém o botão redondo se o alvo de toque mudar de tamanho.
   */
  fab: {
    alignItems: 'center',
    backgroundColor: colors.accent.base,
    borderRadius: control.fab,
    height: control.fab,
    justifyContent: 'center',
    width: control.fab,
  },
  fabPressed: {
    backgroundColor: colors.accent.pressed,
  },

  scrim: {
    backgroundColor: colors.scrim,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  /**
   * Ancorada embaixo: a folha nasce perto do botão que a abriu e perto do polegar que vai escolher.
   * Só os cantos de cima têm raio — os de baixo encostam na borda do aparelho.
   */
  sheet: {
    backgroundColor: colors.surface.overlay,
    borderTopColor: colors.border.subtle,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    bottom: 0,
    gap: space.lg,
    left: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    position: 'absolute',
    right: 0,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    ...type.heading,
    color: colors.text.primary,
  },
  close: {
    alignItems: 'center',
    height: control.size,
    justifyContent: 'center',
    // Encosta o X na borda da folha sem encolher o alvo de toque abaixo do mínimo confortável.
    marginRight: -space.md,
    width: control.size,
  },

  group: {
    gap: space.sm,
  },
  groupTitle: {
    ...type.caption,
    color: colors.text.muted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  /** Um bloco só com réguas internas, como as linhas de grupo do resumo. */
  optionList: {
    backgroundColor: colors.surface.raised,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: control.size,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  optionPressed: {
    backgroundColor: colors.surface.selected,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface.overlay,
    borderRadius: space.xxl,
    height: space.xxl,
    justifyContent: 'center',
    width: space.xxl,
  },
  optionLabel: {
    ...type.body,
    color: colors.text.primary,
    flexShrink: 1,
  },
  /** Recuada até depois do ícone, para a régua separar os rótulos e não cortar a linha inteira. */
  rule: {
    backgroundColor: colors.border.subtle,
    height: StyleSheet.hairlineWidth,
    marginLeft: space.md + space.xxl + space.md,
  },
});
