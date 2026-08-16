import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

export const styles = StyleSheet.create({
  sections: {
    gap: space.sm,
    marginTop: space.sm,
  },
  sectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: space.sm
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text.primary,
    fontSize: 16
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
  containerCardExpenseInformation: {
    width: "100%",
    padding: space.xl,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
  },

  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.xl,
  },

  walletIcon: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: 999,
  },

  expenseTitle: {
    ...type.body,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
  },

  expenseInformation: {
    width: "100%",
    marginBottom: space.xl,
  },

  expenseLabel: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: space.xs,
  },

  expenseAmount: {
    marginBottom: space.xs,
  },

  expenseQuantity: {
    ...type.caption,
    color: colors.text.secondary,
    fontSize: 13,
  },

  containerRegisterButton: {
    width: "100%",
    alignItems: "center",
    gap: 10
  },

  registerButton: {
    width: "100%",
  },
});

