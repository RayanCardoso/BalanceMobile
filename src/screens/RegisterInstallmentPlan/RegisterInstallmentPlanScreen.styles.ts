import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.sm,
    marginTop: space.lg,
    padding: space.md,
  },
  summaryTitle: {
    ...type.heading,
    color: colors.text.primary,
    fontSize: 16,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  summaryPosition: {
    ...type.caption,
    color: colors.text.primary,
    fontSize: 13,
  },
  summaryMonth: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
    marginBottom: space.sm,
  },
});

