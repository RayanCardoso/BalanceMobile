import { Stack } from 'expo-router';

import { stackHeader } from '@/features/navigation/ui/headers';
import { stackScreenOptions } from '@/shared/ui/theme';

/**
 * Contas recorrentes como um navegador só, no formato que `catalogue/_layout.tsx` estabeleceu.
 *
 * Obrigatório sob o `Drawer`: sem este arquivo, cada tela desta pasta viraria um destino da
 * gaveta em vez de ser empilhada sobre a lista.
 */
export default function RecurringLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true, header: stackHeader }}>
      <Stack.Screen name="index" options={{ title: 'Contas recorrentes' }} />
      <Stack.Screen name="new" options={{ title: 'Nova conta recorrente' }} />
      <Stack.Screen name="payment" options={{ title: 'Pagamento de conta recorrente' }} />
      <Stack.Screen name="change-value" options={{ title: 'Alterar valor base' }} />
    </Stack>
  );
}
