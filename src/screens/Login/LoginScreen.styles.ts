import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  prompt: {
    ...type.body,
    color: colors.text.muted,
  },
  link: {
    ...type.label,
    color: colors.accent.text,
    fontSize: 15,
  },
});

