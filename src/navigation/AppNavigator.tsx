import { Drawer } from 'expo-router/drawer';

import { AppDrawer } from '@/navigation/AppDrawer';
import { drawerHeader } from '@/navigation/headers';
import { colors } from '@/components/theme';

/**
 * O navegador do app assinado: cinco destinos numa gaveta lateral.
 *
 * **Cada destino de pasta tem o seu próprio `Stack`** (`income/_layout.tsx` e companhia). Sem eles,
 * `/expenses/new` viraria um item da gaveta em vez de ser empilhado sobre Despesas — é assim que o
 * Expo Router trata um arquivo de pasta sem layout sob um `Drawer`.
 *
 * O Resumo é a exceção: é a rota índice do grupo, não tem Stack próprio, e por isso recebe a barra
 * superior daqui em vez de um layout de pasta.
 *
 * `drawerType: 'front'` desliza a gaveta por cima da tela em vez de empurrá-la. É o que mantém o
 * conteúdo no lugar enquanto o menu está aberto.
 */
export function AppNavigator(): React.JSX.Element {
  return (
    <Drawer
      drawerContent={({ navigation }: { navigation: { closeDrawer: () => void } }) => (
        <AppDrawer onNavigate={() => navigation.closeDrawer()} />
      )}
      screenOptions={{
        drawerStyle: { backgroundColor: colors.surface.raised },
        drawerType: 'front',
        // A barra de cada destino vem do Stack da sua pasta; sem isto haveria duas.
        headerShown: false,
        overlayColor: colors.scrim,
        sceneStyle: { backgroundColor: colors.surface.base },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ header: drawerHeader('Resumo do mês'), headerShown: true }}
      />
      <Drawer.Screen name="income" />
      <Drawer.Screen name="expenses" />
      <Drawer.Screen name="catalogue" />
    </Drawer>
  );
}
