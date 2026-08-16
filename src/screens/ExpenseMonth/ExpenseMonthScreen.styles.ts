import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sections: {
    gap: space.sm,
    marginTop: space.sm,
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text.primary,
    fontSize: 16,
    marginTop: space.sm,
  },
  total: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    gap: space.sm,
  },
  row: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.xs,
    padding: space.md,
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  figure: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  figureLabel: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
  },
  detail: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
  },
  provisional: {
    ...type.caption,
    color: colors.text.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  absent: {
    ...type.body,
    color: colors.text.muted,
    fontSize: 16,
  },
});

