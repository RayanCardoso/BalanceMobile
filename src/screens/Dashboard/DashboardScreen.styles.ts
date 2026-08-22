import { StyleSheet } from 'react-native';

import { card, colors, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sections: {
    gap: space.lg,
    marginTop: space.md,
  },

  summary: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.lg,
    padding: space.lg,
  },
  summaryHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    ...type.heading,
    color: colors.text.primary,
  },
  /** A legenda que ensina a ler as duas colunas de número sem precisar de dois rótulos por linha. */
  summaryHint: {
    ...type.caption,
    color: colors.text.muted,
  },
  line: {
    gap: space.sm,
  },
  lineTop: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  figures: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.sm,
  },
  /**
   * O previsto é a referência, não a resposta: fica em cinza de apoio, menor que o real ao lado.
   *
   * Era `text.tertiary`, um azul quase idêntico ao `accent.base`. Dois azuis na mesma tela, e nenhum
   * dos dois era a ação — é exatamente o que fazia o destaque real desaparecer.
   */
  expected: {
    ...type.caption,
    color: colors.text.muted,
  },
  arrow: {
    ...type.caption,
    color: colors.text.muted,
  },
  /** A trilha da barra. A largura do preenchimento é calculada na tela, não aqui. */
  track: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    height: space.xs,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    height: space.xs,
  },
  /** O saldo é a conclusão das duas linhas acima, então se separa delas por uma régua. */
  balanceLine: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    paddingTop: space.md,
  },

  /**
   * As quatro partições são um bloco só, não quatro cartões: a borda e o raio vivem aqui, e cada
   * linha lá dentro não tem chrome nenhum. `overflow` é o que impede a primeira e a última linha de
   * vazarem por cima do raio quando estão pressionadas.
   */
  groups: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  group: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
  },
  groupPressed: {
    backgroundColor: colors.surface.overlay,
  },
  /** Um disco cinza em vez de um ícone solto: iguala o peso das quatro linhas e ancora a coluna. */
  groupIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface.overlay,
    borderRadius: space.xxl,
    height: space.xxl,
    justifyContent: 'center',
    width: space.xxl,
  },
  /** Recuada até depois do disco, para separar os nomes em vez de cortar a linha inteira. */
  rule: {
    backgroundColor: colors.border.subtle,
    height: StyleSheet.hairlineWidth,
    marginLeft: space.md + space.xxl + space.md,
  },
  groupText: {
    flex: 1,
    gap: space.xs,
  },
  groupName: {
    ...type.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  groupCount: {
    ...type.caption,
    color: colors.text.muted,
  },

  /** Rótulo de seção, não título: menor que os nomes que ele encabeça, e fora do bloco deles. */
  sectionTitle: {
    ...type.caption,
    color: colors.text.muted,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: space.sm,
    textTransform: 'uppercase',
  },
  /** `overflow: 'visible'` deixa o cartão sangrar até a borda da tela enquanto o carrossel rola. */
  carousel: {
    overflow: 'visible',
  },
  carouselContent: {
    gap: space.md,
  },
  /** Tracejado porque não é uma conta: é o lugar onde uma conta vai aparecer. */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.strong,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: space.sm,
    height: card.height,
    justifyContent: 'center',
    width: card.width,
  },
  emptyCardLabel: {
    ...type.label,
    color: colors.accent.text,
  },
});
