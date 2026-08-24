import { StyleSheet } from 'react-native';

import { colors, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sectionLabel: {
    ...type.label,
    color: colors.text.secondary,
    marginTop: space.sm,
  },
  /** A conta que o menu da linha já escolheu: contexto, não campo. */
  billName: {
    ...type.heading,
    color: colors.text.primary,
    marginBottom: space.sm,
    marginTop: space.sm,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});
