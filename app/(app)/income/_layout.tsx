import { Stack } from 'expo-router';

import { stackHeader } from '@/features/navigation/ui/headers';
import { stackScreenOptions } from '@/shared/ui/theme';

/**
 * Receitas como um navegador só, no formato que `catalogue/_layout.tsx` estabeleceu.
 *
 * Obrigatório sob o `Drawer`: sem este arquivo, cada tela desta pasta viraria um destino da
 * gaveta em vez de ser empilhada sobre a lista do mês.
 */
export default function IncomeLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true, header: stackHeader }}>
      <Stack.Screen name="index" options={{ title: 'Receitas' }} />
      <Stack.Screen name="new" options={{ title: 'Nova fonte de renda' }} />
      <Stack.Screen name="payment" options={{ title: 'Registrar recebimento' }} />
      <Stack.Screen name="change-value" options={{ title: 'Alterar valor' }} />
    </Stack>
  );
}
