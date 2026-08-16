import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  list: {
    gap: space.sm,
    marginTop: space.sm,
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
  absent: {
    ...type.body,
    color: colors.text.muted,
    fontSize: 16,
  },
  containerCardIncomeInformation: {
    flexDirection: "row", 
    width: "100%",
    justifyContent: "space-between",
    padding: space.xl,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1
  },
  cardIncomeInformations: {
    flexDirection: "row",
  },
  dollarIcon: {
    backgroundColor: colors.surface.raised,
    borderRadius: 999,
    padding: space.md
  },
  incomeInformations: {
    justifyContent: "center",
    marginLeft: 10
  },
  textIncomeInformations: {
    color: colors.text.primary
  }
});

