import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.base,
    flex: 1,
    gap: space.md,
    padding: space.lg,
  },
  item: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: 16,
    padding: space.lg,
  },
});

