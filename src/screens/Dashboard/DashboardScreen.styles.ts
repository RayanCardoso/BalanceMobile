import { StyleSheet } from 'react-native';

import { colors, control, disabledOpacity, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sections: {
    gap: space.sm,
    marginTop: space.sm,
  },
  totals: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  total: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...type.label,
    color: colors.text.secondary,
    fontSize: 14,
  },
  group: {
    gap: space.sm,
    marginTop: space.md,
  },
  groupTitle: {
    ...type.heading,
    color: colors.text.primary,
    fontSize: 16,
  },
  list: {
    gap: space.sm,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: space.md,
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  detail: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
  },
  absent: {
    ...type.body,
    color: colors.text.muted,
    fontSize: 16,
  },
});

