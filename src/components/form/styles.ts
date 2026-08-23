import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * A coluna de um campo, e as duas formas que o controle dentro dela pode ter.
 *
 * `input` é o `TextInput` do `Field`. `box` é a caixa pressionável que o `FieldTrigger` desenha —
 * mesma altura, `paddingVertical` um ponto maior, porque ali o conteúdo é um `Text` sem a caixa
 * interna que o `TextInput` acrescenta. Os dois vivem aqui e não em cada componente porque um
 * formulário com data, texto e seleção lado a lado precisa de uma coluna só.
 */
export const fieldStyles = StyleSheet.create({
  field: {
    gap: space.xs + 2,
    marginBottom: space.lg,
  },
  label: {
    ...type.label,
    color: colors.text.secondary,
  },
  input: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  invalid: {
    borderColor: colors.status.negative,
  },
  value: {
    ...type.body,
    color: colors.text.primary,
  },
  placeholder: {
    ...type.body,
    color: colors.text.muted,
  },
  error: {
    ...type.caption,
    color: colors.status.negative,
  },
});
