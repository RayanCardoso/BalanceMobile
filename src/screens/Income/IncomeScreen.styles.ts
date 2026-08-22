import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  containerFigureAndLabel: {
    flexDirection: "row", 
    justifyContent: "space-between"
  },
  containerFigure: {
    width: "50%"
  },
  row: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.xs,
    padding: space.md,
  },
  rowHeader: {
    flexDirection: "row",
    marginBottom: 10,
    justifyContent: "space-between"
  },
  rowName: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  figure: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: "100%"
  },
  figureLabel: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13
  },
  absent: {
    ...type.body,
    color: colors.text.muted,
    fontSize: 16,
  },

  expectedAmountText: {
    color: colors.text.muted
  },

  sectionTitle: {
    ...type.heading,
    color: colors.text.primary,
    marginTop: 15, 
    marginBottom: 10, 
    fontSize: 16
  },

  containerCardIncomeInformation: {
    width: "100%",
    padding: space.xl,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  incomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.xl,
  },

  dollarIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: 999,
  },

  incomeTitle: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },

  incomeValues: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: space.xl,
  },

  incomeValue: {
    flex: 1,
  },

  incomeLabel: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: space.xs,
  },

  incomeAmount: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: space.xs,
  },

  incomeQuantity: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
  },

  divider: {
    width: 1,
    height: 75,
    backgroundColor: colors.border.subtle,
    marginHorizontal: space.lg,
  },

  containerRegisterButton: {
    width: "100%",
    alignItems: "center",
  },

  registerButton: {
    width: "100%",
  },

  optionsMenu: {
    alignSelf: 'flex-end',
    width: 210,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: space.xs,
    overflow: 'hidden',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },

  optionText: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 14,
  },
});

