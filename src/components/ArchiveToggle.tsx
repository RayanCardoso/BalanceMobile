import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useArchiveRecurringExpense } from '@/hooks/useRecurring';
import { colors, space, type } from '@/components/theme';

/**
 * Spec REC AC7 and AC8. Archiving removes a bill from every month at once (design.md), which is
 * destructive-feeling even though nothing is deleted - so it asks first. Unarchiving is the recovery
 * path, not a second destructive action, and asks nothing.
 *
 * The confirmation is inline rather than `Alert.alert`: a native modal has no DOM RNTL can assert
 * against without mocking the whole `Alert` module, and an inline "tem certeza?" step is both
 * genuinely confirmable by a user and directly testable.
 */
export function ArchiveToggle({
  recurringExpenseId,
  archived,
}: {
  recurringExpenseId: string;
  archived: boolean;
}): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const toggle = useArchiveRecurringExpense();

  if (archived) {
    return (
      <View style={styles.row}>
        <Text style={styles.archivedTag}>Arquivada</Text>
        <Pressable
          accessibilityRole="button"
          disabled={toggle.isPending}
          onPress={() => {
            toggle.mutate({ recurringExpenseId, archived: false });
          }}
        >
          <Text style={styles.link}>Desarquivar</Text>
        </Pressable>
      </View>
    );
  }

  if (confirming) {
    return (
      <View style={styles.row}>
        <Text style={styles.confirmLabel}>Arquivar esta conta?</Text>
        <Pressable
          accessibilityRole="button"
          disabled={toggle.isPending}
          onPress={() => {
            toggle.mutate(
              { recurringExpenseId, archived: true },
              { onSettled: () => setConfirming(false) }
            );
          }}
        >
          <Text style={styles.link}>Confirmar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setConfirming(false);
          }}
        >
          <Text style={styles.link}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        setConfirming(true);
      }}
    >
      <Text style={styles.link}>Arquivar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  archivedTag: {
    ...type.caption,
    color: colors.status.warning,
    fontWeight: '600',
  },
  confirmLabel: {
    ...type.caption,
    color: colors.text.secondary,
  },
  link: {
    ...type.label,
    color: colors.accent.text,
  },
});
