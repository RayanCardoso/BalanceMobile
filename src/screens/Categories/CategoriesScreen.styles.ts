import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
  list: {
    gap: space.sm,
    marginTop: space.lg,
  },
  row: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: space.md,
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  rowDetail: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
  },
});

