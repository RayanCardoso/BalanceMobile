import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useRecurringExpenses } from '@/features/recurring/api/useRecurring';
import { ArchiveToggle } from '@/features/recurring/ui/ArchiveToggle';
import { listErrorMessage } from '@/features/recurring/ui/errors';
import { formatMoney } from '@/shared/lib/money';
import { EmptyState, ErrorState, Loading, Screen } from '@/shared/ui/states';

/**
 * Spec REC-01 and REC-02, and T51's list-all endpoint - the only surface an archived bill's id stays
 * reachable through, since the monthly expense view excludes archived rows by design.
 *
 * Each row shows its due day, its estimate flag and its archived state as three separate facts (not
 * folded into one summary line): lesson L-004 records that a totals-only assertion is exactly what
 * let a pass-through field ship wrong in the backend.
 */
export function RecurringBillsScreen(): React.JSX.Element {
  const bills = useRecurringExpenses();

  const renderList = (): React.JSX.Element => {
    if (bills.isError) {
      return (
        <ErrorState
          message={listErrorMessage(bills.error)}
          onRetry={() => {
            void bills.refetch();
          }}
        />
      );
    }

    if (bills.data === undefined) {
      return <Loading />;
    }

    if (bills.data.length === 0) {
      return (
        <EmptyState message="Nenhuma conta recorrente cadastrada. Contas fixas como aluguel e luz aparecem aqui." />
      );
    }

    return (
      <View style={styles.list} testID="recurring-list">
        {bills.data.map((bill) => {
          const currentVersion = bill.versions[bill.versions.length - 1];

          return (
            <View key={bill.id} style={styles.row}>
              <Text style={styles.rowName}>{bill.name}</Text>
              <Text style={styles.rowDetail}>vence dia {bill.dueDay}</Text>
              {currentVersion === undefined ? null : (
                <Text style={styles.rowDetail}>
                  {formatMoney(currentVersion.amount)}
                  {bill.isEstimate ? ' (estimativa)' : ''}
                </Text>
              )}
              <ArchiveToggle archived={bill.archived} recurringExpenseId={bill.id} />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Contas recorrentes</Text>
        <Link href="/recurring/new" style={styles.newLink}>
          Nova conta
        </Link>
      </View>

      {renderList()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  newLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    padding: 12,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 13,
  },
});
