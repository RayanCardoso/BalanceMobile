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
    flexDirection: "row", 
    width: "100%",
    justifyContent: "space-between",
    padding: space.xl,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1
  },
  cardExpenseInformations: {
    flexDirection: "row",
  },
  walletIcon: {
    backgroundColor: colors.surface.raised,
    borderRadius: 999,
    padding: space.md
  },
  expenseInformations: {
    justifyContent: "center",
    marginLeft: 10
  },
  textExpenseInformations: {
    color: colors.text.primary
  }
});

