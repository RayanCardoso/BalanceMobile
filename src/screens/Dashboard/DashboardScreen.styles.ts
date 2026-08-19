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
  /** O previsto é a referência, não a resposta: fica no azul de apoio, menor que o real ao lado. */
  expected: {
    ...type.caption,
    color: colors.text.tertiary,
  },
  arrow: {
    ...type.caption,
    color: colors.text.muted,
  },
  /** A trilha da barra. A largura do preenchimento é calculada na tela, não aqui. */
  track: {
    backgroundColor: colors.surface.overlay,
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

  groups: {
    gap: space.sm,
  },
  group: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
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

  sectionTitle: {
    ...type.label,
    color: colors.text.secondary,
    marginBottom: space.sm,
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
    color: colors.accent.base,
  },
});
