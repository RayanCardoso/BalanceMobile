import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  toggle: {
    paddingVertical: space.sm,
  },
  toggleLabel: {
    ...type.label,
    color: colors.accent.text,
    fontSize: 14,
  },
  notice: {
    ...type.body,
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: space.sm,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});

