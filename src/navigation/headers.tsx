import { TopBar } from '@/navigation/TopBar';
import type { HeaderNavigation } from '@/navigation/types';

/**
 * Como cada navegador monta o `TopBar`. Fica fora dos `_layout.tsx` porque são quatro Stacks
 * pedindo exatamente a mesma barra, e uma cópia por pasta é uma cópia que diverge.
 *
 * O tipo de `navigation` é declarado aqui, estruturalmente, em vez de importado do React
 * Navigation: o drawer do Expo Router é vendorizado e o seu `DrawerRouter` está documentado como
 * implementação interna, sujeita a mudar entre versões. Isto é o que precisamos dele e nada mais.
 */
/**
 * O payload literal de `DrawerActions.openDrawer()`. Despachado como objeto para não importar de
 * `expo-router/react-navigation`, cujo módulo de routers é interno. A ação sobe do Stack até o
 * Drawer, que é quem a atende.
 */
const OPEN_DRAWER = { type: 'OPEN_DRAWER' } as const;

export function stackHeader({
  navigation,
  options,
  back,
}: {
  navigation: HeaderNavigation;
  options: { title?: string };
  /** Definido pelo Stack apenas quando existe uma tela abaixo desta na pilha. */
  back?: unknown;
}): React.JSX.Element {
  return (
    <TopBar
      onBack={back === undefined ? undefined : () => navigation.goBack()}
      onMenu={() => navigation.dispatch(OPEN_DRAWER)}
      title={options.title ?? ''}
    />
  );
}

/** O Resumo é a única rota sem Stack próprio, então a barra dele vem do Drawer. */
export const drawerHeader =
  (title: string) =>
  ({ navigation }: { navigation: HeaderNavigation }): React.JSX.Element => (
    <TopBar onMenu={() => navigation.dispatch(OPEN_DRAWER)} title={title} />
  );
