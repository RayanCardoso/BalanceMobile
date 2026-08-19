import { Stack } from 'expo-router';

import { stackHeader } from '@/navigation/headers';
import { stackScreenOptions } from '@/components/theme';

/**
 * Categorias tem `Stack` próprio pelo mesmo motivo que Receitas e Despesas: sob um `Drawer`, um arquivo
 * solto na raiz de `(app)` vira uma tela de gaveta, sem botão de voltar. Esta tela é alcançada pelos
 * atalhos do resumo, então o retorno é obrigatório — e é o `Stack` que o fornece.
 */
export default function CategoriesLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, header: stackHeader, headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Categorias' }} />
    </Stack>
  );
}
