import { Stack } from 'expo-router';

import { stackHeader } from '@/navigation/headers';
import { stackScreenOptions } from '@/components/theme';

/**
 * Despesas como um navegador só, no formato que `catalogue/_layout.tsx` estabeleceu.
 *
 * Obrigatório sob o `Drawer`: sem este arquivo, cada tela desta pasta viraria um destino da
 * gaveta em vez de ser empilhada sobre a lista do mês.
 */
export default function ExpensesLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true, header: stackHeader }}>
      <Stack.Screen name="index" options={{ title: 'Despesas' }} />
      <Stack.Screen name="variable/new" options={{ title: 'Nova despesa' }} />
      <Stack.Screen name="variable/installment-plan" options={{ title: 'Nova compra parcelada' }} />
      <Stack.Screen name="recurring/new" options={{ title: 'Nova despesa recorrente' }} />
      <Stack.Screen name="recurring/payment" options={{ title: 'Pagamento de despesa recorrente' }} />
      <Stack.Screen name="recurring/change-value" options={{ title: 'Alterar valor base' }} />
    </Stack>
  );
}
