import { Stack } from 'expo-router';

import { stackHeader } from '@/navigation/headers';
import { stackScreenOptions } from '@/components/theme';

/**
 * Receitas como um navegador só.
 *
 * Obrigatório sob o `Drawer`: sem este arquivo, cada tela desta pasta viraria um destino da gaveta
 * em vez de ser empilhada sobre a lista do mês.
 *
 * Registrar recebimento não está aqui, e é deliberado: virou um modal sobre a própria lista
 * (`RecordIncomePaymentModal`). Um formulário de três campos, aberto a partir de uma linha que já
 * diz de quem ele é, não precisava de uma rota nem de params para se descobrir.
 */
export default function IncomeLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true, header: stackHeader }}>
      <Stack.Screen name="index" options={{ title: 'Receitas' }} />
      <Stack.Screen name="new" options={{ title: 'Nova fonte de renda' }} />
      <Stack.Screen name="change-value" options={{ title: 'Alterar valor' }} />
    </Stack>
  );
}
