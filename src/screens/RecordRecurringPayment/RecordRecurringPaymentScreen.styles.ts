import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sectionLabel: {
    ...type.label,
    color: colors.text.secondary,
    marginTop: space.sm,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});

