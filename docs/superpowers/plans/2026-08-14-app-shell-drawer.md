# Gaveta lateral e telas responsivas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a barra de destinos do rodapé por uma gaveta lateral com barra superior, e fazer as telas do grupo assinado respeitarem a status bar, a barra de gestos do Android e o teclado.

**Architecture:** O `AppShell` passa a renderizar o `Drawer` do `expo-router/drawer` no lugar do `Stack`. Cada destino de pasta ganha um `Stack` próprio para que suas telas continuem empilhando em vez de virarem itens do menu. Um único `TopBar` serve as duas situações — mostra `←` quando há para onde voltar e `☰` quando não há. As correções de safe area ficam concentradas em `TopBar` e `Screen`, de onde as 16 telas as herdam.

**Tech Stack:** Expo SDK 57, Expo Router 57 (`expo-router/drawer`, com o drawer do React Navigation vendorizado), `react-native-safe-area-context` 5.7 (já instalado, ainda sem uso), Jest + `@testing-library/react-native`.

Spec: [`docs/superpowers/specs/2026-08-14-app-shell-drawer-design.md`](../specs/2026-08-14-app-shell-drawer-design.md)

## Global Constraints

- **Nenhuma dependência nova.** O drawer já vem vendorizado no `expo-router`; `react-native-drawer-layout`, `react-native-gesture-handler`, `react-native-reanimated` e `react-native-safe-area-context` já estão no `package.json`.
- **Nenhum `#rrggbb` fora de `src/shared/ui/theme.ts`.** Falta de token se resolve adicionando o token, nunca localmente.
- **Nenhum `padding`, `margin`, `gap`, `fontSize` ou `borderRadius` numérico solto.** Tudo sai de `space`, `type` e `radius`.
- **Todo container de tela tem `backgroundColor` explícito** — um `View` sem fundo herda branco em algumas superfícies do RN.
- **Copy em pt-BR**, reaproveitando os textos que já existem nas telas. Nenhuma string nova inventada.
- **Testes olham `testID` e `accessibilityRole`**, então mudança de estilo não deve quebrá-los.
- Ao final de cada tarefa: `npx tsc --noEmit` e `npm test` passam.

---

### Task 1: Tokens e o `TopBar`

**Files:**
- Modify: `src/shared/ui/theme.ts`
- Create: `src/features/navigation/ui/TopBar.tsx`
- Test: `src/features/navigation/ui/TopBar.test.tsx`

**Interfaces:**
- Consumes: `colors`, `space`, `type` de `@/shared/ui/theme`.
- Produces:
  - `colors.scrim: string` — o escurecido atrás da gaveta.
  - `control: { size: number; bar: number }` — métrica dos controles da barra.
  - `TopBar(props: { title: string; onBack?: () => void; onMenu: () => void }): React.JSX.Element` — mostra `←` quando `onBack` está definido, `☰` quando não. `testID`s: `top-bar-back`, `top-bar-menu`, `top-bar-title`.

- [ ] **Step 1: Escrever o teste que falha**

`src/features/navigation/ui/TopBar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TopBar } from '@/features/navigation/ui/TopBar';

/**
 * A barra decide sozinha qual controle mostrar, e é isso que faz nenhuma tela precisar saber em
 * que profundidade está. As duas asserções negativas importam tanto quanto as positivas: mostrar
 * os dois controles ao mesmo tempo é o defeito que o design descartou.
 */
describe('o controle que a barra mostra', () => {
  it('mostra voltar, e não o menu, quando há para onde voltar', () => {
    render(<TopBar onBack={jest.fn()} onMenu={jest.fn()} title="Nova despesa" />);

    expect(screen.getByTestId('top-bar-back')).toBeTruthy();
    expect(screen.queryByTestId('top-bar-menu')).toBeNull();
  });

  it('mostra o menu, e não voltar, quando é a raiz do destino', () => {
    render(<TopBar onMenu={jest.fn()} title="Despesas" />);

    expect(screen.getByTestId('top-bar-menu')).toBeTruthy();
    expect(screen.queryByTestId('top-bar-back')).toBeNull();
  });

  it('chama onBack ao tocar em voltar', () => {
    const onBack = jest.fn();
    render(<TopBar onBack={onBack} onMenu={jest.fn()} title="Nova despesa" />);

    fireEvent.press(screen.getByTestId('top-bar-back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('chama onMenu ao tocar no menu', () => {
    const onMenu = jest.fn();
    render(<TopBar onMenu={onMenu} title="Despesas" />);

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('mostra o título recebido', () => {
    render(<TopBar onMenu={jest.fn()} title="Pagamento de conta recorrente" />);

    expect(screen.getByText('Pagamento de conta recorrente')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/features/navigation/ui/TopBar.test.tsx
```

Esperado: FAIL — `Cannot find module '@/features/navigation/ui/TopBar'`.

- [ ] **Step 3: Adicionar os tokens em `theme.ts`**

Dentro do objeto `colors`, depois do bloco `accent` e antes de `status`:

```ts
  /**
   * O escurecido que separa a gaveta da tela atrás dela. Não é uma superfície: é o navy do app com
   * alfa, para que o conteúdo continue legível como contexto sem competir com o menu.
   */
  scrim: 'rgba(6, 18, 42, 0.6)',
```

Depois de `export const radius = {...}`:

```ts
/**
 * Os controles desenhados no `TopBar`. `size` é o alvo de toque — 44 é o mínimo confortável em
 * ambas as plataformas — e `bar` é a espessura de um traço do ☰.
 */
export const control = { size: 44, bar: 2 } as const;
```

- [ ] **Step 4: Escrever o `TopBar`**

`src/features/navigation/ui/TopBar.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, control, space, type } from '@/shared/ui/theme';

/**
 * A barra superior de todas as telas assinadas, e a única peça que sabe qual controle cada uma
 * merece: `←` quando a tela foi empilhada sobre outra, `☰` quando ela é a raiz de um destino.
 *
 * A decisão vive aqui em vez de em cada tela porque é sempre a mesma decisão. Quem monta a barra
 * passa `onBack` apenas quando existe para onde voltar, e a ausência da prop é o sinal.
 *
 * `insets.top` é o motivo de esta barra existir como componente e não como opção de header: o
 * Expo SDK 57 liga edge-to-edge no Android, então sem este `paddingTop` o título nasce debaixo do
 * relógio e da bateria.
 */
export function TopBar({
  title,
  onBack,
  onMenu,
}: {
  title: string;
  /** Quando definido, a barra mostra voltar no lugar do menu. */
  onBack?: () => void;
  onMenu: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
      {onBack === undefined ? (
        <Pressable
          accessibilityLabel="Abrir menu"
          accessibilityRole="button"
          onPress={onMenu}
          style={styles.control}
          testID="top-bar-menu"
        >
          {/* Três traços em vez de um ícone: o projeto não tem fonte de ícones, e dois glifos não
              justificam uma dependência. */}
          <View style={styles.rule} />
          <View style={styles.rule} />
          <View style={styles.rule} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.control}
          testID="top-bar-back"
        >
          <Text style={styles.arrow}>←</Text>
        </Pressable>
      )}

      {/* Uma linha só: "Pagamento de conta recorrente" não cabe em telas estreitas. */}
      <Text numberOfLines={1} style={styles.title} testID="top-bar-title">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    paddingBottom: space.sm,
    paddingHorizontal: space.sm,
  },
  control: {
    alignItems: 'center',
    gap: space.xs,
    height: control.size,
    justifyContent: 'center',
    width: control.size,
  },
  rule: {
    backgroundColor: colors.text.primary,
    height: control.bar,
    width: space.xl,
  },
  arrow: {
    ...type.title,
    color: colors.text.primary,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
    flexShrink: 1,
  },
});
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

```bash
npx jest src/features/navigation/ui/TopBar.test.tsx
```

Esperado: PASS, 5 testes.

- [ ] **Step 6: Verificar tipos e commitar**

```bash
npx tsc --noEmit
```

```bash
git add src/shared/ui/theme.ts src/features/navigation/ui/TopBar.tsx src/features/navigation/ui/TopBar.test.tsx
git commit -m "feat(mobile): add the top bar that carries back or the menu"
```

---

### Task 2: `AppDrawer`, o conteúdo da gaveta

**Files:**
- Create: `src/features/navigation/ui/AppDrawer.tsx`
- Test: `src/features/navigation/ui/AppDrawer.test.tsx`

**Interfaces:**
- Consumes: `useSignOut` de `@/features/auth/api/useSignOut` (assinatura `() => () => Promise<void>`), `useSessionStore` de `@/shared/lib/sessionStore` (campo `name: string | null`), tokens de `@/shared/ui/theme`.
- Produces: `AppDrawer(props: { onNavigate?: () => void }): React.JSX.Element` — os cinco destinos, o nome do usuário e Sair. `onNavigate` é chamado ao tocar num destino, e é como o `AppShell` fecha a gaveta.

- [ ] **Step 1: Escrever o teste que falha**

`src/features/navigation/ui/AppDrawer.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AppDrawer } from '@/features/navigation/ui/AppDrawer';
import { qk } from '@/shared/api/queryKeys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/api/testQueryClient';
import { useSessionStore } from '@/shared/lib/sessionStore';
import { clearToken } from '@/shared/lib/tokenStorage';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

/**
 * `Link` vira um `Text` carregando o `href` como `testID`, o mesmo substituto que
 * `AppShell.test.tsx` e `CatalogueMenu.test.tsx` usam. `usePathname` é o que decide o destino
 * ativo, então o teste o controla.
 */
let pathname = '/';

jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Link = ({
    href,
    children,
    onPress,
  }: {
    href: string;
    children: ReactNode;
    onPress?: () => void;
  }) => react.createElement(rn.Text, { testID: `link-${href}`, onPress }, children);

  return { Link, usePathname: () => pathname };
});

const storageCleared = clearToken as jest.MockedFunction<typeof clearToken>;

let client = createTestQueryClient();

const renderDrawer = (props: { onNavigate?: () => void } = {}): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <Wrapper>
      <AppDrawer {...props} />
    </Wrapper>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  pathname = '/';
  storageCleared.mockResolvedValue(undefined);
  useSessionStore.setState({ token: 'issued-token', name: 'Rayan', status: 'signedIn' });
  client = createTestQueryClient();
});

afterEach(() => {
  client.clear();
});

describe('os destinos que a gaveta alcança (spec DASH AC1)', () => {
  it('alcança resumo, receitas, despesas, recorrentes e catálogo', () => {
    renderDrawer();

    expect(screen.getByTestId('link-/')).toBeTruthy();
    expect(screen.getByTestId('link-/income')).toBeTruthy();
    expect(screen.getByTestId('link-/expenses')).toBeTruthy();
    expect(screen.getByTestId('link-/recurring')).toBeTruthy();
    expect(screen.getByTestId('link-/catalogue')).toBeTruthy();
  });

  it('rotula cada destino em português', () => {
    renderDrawer();

    expect(screen.getByText('Resumo')).toBeTruthy();
    expect(screen.getByText('Receitas')).toBeTruthy();
    expect(screen.getByText('Despesas')).toBeTruthy();
    expect(screen.getByText('Recorrentes')).toBeTruthy();
    expect(screen.getByText('Catálogo')).toBeTruthy();
  });

  it('avisa quem abriu a gaveta que um destino foi escolhido, para ela poder fechar', () => {
    const onNavigate = jest.fn();
    renderDrawer({ onNavigate });

    fireEvent.press(screen.getByTestId('link-/income'));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('qual destino aparece como o atual', () => {
  /**
   * O destino ativo é lido do caminho, não de estado próprio: um menu que guardasse o seu
   * "selecionado" mentiria depois de um voltar pelo botão do Android.
   */
  it('marca receitas quando o caminho está sob /income', () => {
    pathname = '/income/new';
    renderDrawer();

    expect(screen.getByTestId('destination-active')).toHaveTextContent('Receitas');
  });

  it('marca o resumo apenas na raiz, e não em todo caminho que começa com /', () => {
    pathname = '/expenses';
    renderDrawer();

    expect(screen.getByTestId('destination-active')).toHaveTextContent('Despesas');
  });
});

describe('quem está na sessão', () => {
  it('mostra o nome do usuário', () => {
    renderDrawer();

    expect(screen.getByText('Rayan')).toBeTruthy();
  });

  /** `restore()` repõe o token mas não o nome, então um início a frio chega aqui sem ele. */
  it('não deixa buraco quando a sessão foi restaurada sem nome', () => {
    useSessionStore.setState({ token: 'issued-token', name: null, status: 'signedIn' });
    renderDrawer();

    expect(screen.queryByTestId('drawer-user-name')).toBeNull();
    expect(screen.getByText('Balance')).toBeTruthy();
  });
});

describe('sair pela gaveta (spec AUTH AC6)', () => {
  it('limpa o token guardado e devolve a sessão para signedOut', async () => {
    renderDrawer();

    fireEvent.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('signedOut');
    });

    expect(useSessionStore.getState().token).toBeNull();
    expect(storageCleared).toHaveBeenCalledTimes(1);
  });

  it("esvazia o cache, para uma segunda conta não ler os dados da primeira", async () => {
    client.setQueryData(qk.people(), [{ id: 'person-1', name: 'Rayan' }]);
    client.setQueryData(qk.dashboard(2026, 8), { balance: 5529.5 });
    renderDrawer();

    fireEvent.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });

    expect(client.getQueryData(qk.people())).toBeUndefined();
    expect(client.getQueryData(qk.dashboard(2026, 8))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/features/navigation/ui/AppDrawer.test.tsx
```

Esperado: FAIL — `Cannot find module '@/features/navigation/ui/AppDrawer'`.

- [ ] **Step 3: Escrever o `AppDrawer`**

`src/features/navigation/ui/AppDrawer.tsx`:

```tsx
import { Link, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSignOut } from '@/features/auth/api/useSignOut';
import { useSessionStore } from '@/shared/lib/sessionStore';
import { colors, radius, space, type } from '@/shared/ui/theme';

/**
 * O conteúdo da gaveta: os cinco destinos do app e a saída dele.
 *
 * O destino ativo sai de `usePathname`, não de estado guardado aqui. Um menu com o próprio
 * "selecionado" passaria a mentir na primeira vez que o usuário voltasse pelo botão do Android,
 * porque essa navegação não passa por este componente.
 *
 * **Sair mora aqui** (spec AUTH AC6). A gaveta é a superfície alcançável de qualquer tela
 * assinada, que é a mesma razão pela qual o controle vivia na barra do rodapé antes dela.
 */

const DESTINATIONS = [
  { href: '/', label: 'Resumo' },
  { href: '/income', label: 'Receitas' },
  { href: '/expenses', label: 'Despesas' },
  { href: '/recurring', label: 'Recorrentes' },
  { href: '/catalogue', label: 'Catálogo' },
] as const;

/**
 * O resumo casa apenas com a raiz exata. Um `startsWith` puro marcaria "Resumo" como ativo em
 * todo caminho do app, já que todos começam com "/".
 */
const isActive = (href: string, pathname: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function AppDrawer({ onNavigate }: { onNavigate?: () => void }): React.JSX.Element {
  const pathname = usePathname();
  const name = useSessionStore((state) => state.name);
  const signOut = useSignOut();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.drawer, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <View style={styles.identity}>
        <Text style={styles.wordmark}>Balance</Text>
        {/* `restore()` devolve o token sem o nome, então um início a frio chega aqui com null. */}
        {name === null ? null : (
          <Text style={styles.name} testID="drawer-user-name">
            {name}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.destinations}>
        {DESTINATIONS.map((destination) => {
          const active = isActive(destination.href, pathname);

          return (
            <Link
              href={destination.href}
              key={destination.href}
              onPress={onNavigate}
              style={[styles.destination, active && styles.destinationActive]}
              testID={active ? 'destination-active' : undefined}
            >
              {destination.label}
            </Link>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut();
          }}
          style={styles.signOut}
        >
          <Text style={styles.signOutLabel}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface.raised,
    flex: 1,
  },
  identity: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    gap: space.xs,
    padding: space.lg,
  },
  wordmark: {
    ...type.title,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  name: {
    ...type.body,
    color: colors.text.secondary,
  },
  destinations: {
    gap: space.xs,
    padding: space.md,
  },
  destination: {
    ...type.body,
    borderRadius: radius.sm,
    color: colors.text.secondary,
    fontWeight: '600',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  destinationActive: {
    backgroundColor: colors.surface.selected,
    color: colors.accent.base,
  },
  footer: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    padding: space.md,
  },
  signOut: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  signOutLabel: {
    ...type.label,
    color: colors.accent.base,
  },
});
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx jest src/features/navigation/ui/AppDrawer.test.tsx
```

Esperado: PASS, 9 testes.

Se `toHaveTextContent` não estiver disponível, troque as duas asserções de destino ativo por
`expect(screen.getByTestId('destination-active').props.children).toBe('Receitas')`.

- [ ] **Step 5: Verificar tipos e commitar**

```bash
npx tsc --noEmit
```

```bash
git add src/features/navigation/ui/AppDrawer.tsx src/features/navigation/ui/AppDrawer.test.tsx
git commit -m "feat(mobile): add the drawer contents with the five destinations and sign-out"
```

---

### Task 3: `Screen` que respeita a barra de gestos e o teclado

**Files:**
- Modify: `src/shared/ui/states.tsx:37-39` (`Screen`) e o bloco `styles`
- Test: `src/shared/ui/states.test.tsx`

**Interfaces:**
- Consumes: `useSafeAreaInsets` de `react-native-safe-area-context`.
- Produces: `Screen` com a mesma assinatura de hoje — `({ children }: { children: ReactNode }) => React.JSX.Element`. Nenhum chamador muda; as 16 telas herdam o comportamento novo.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `src/shared/ui/states.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '@/shared/ui/states';

/**
 * O `Screen` é o único lugar que sabe da barra de gestos do Android. Concentrar aqui é o que
 * impede "respeitar a safe area" de virar uma regra que toda tela nova precisa lembrar.
 */
describe('o container de tela', () => {
  it('rola, para que um formulário mais alto que a tela continue alcançável', () => {
    render(
      <Screen>
        <Text>conteúdo</Text>
      </Screen>
    );

    expect(screen.getByTestId('screen-scroll')).toBeTruthy();
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });

  it('mantém o fundo escuro explícito, para não piscar branco', () => {
    render(
      <Screen>
        <Text>conteúdo</Text>
      </Screen>
    );

    expect(screen.getByTestId('screen-scroll')).toHaveStyle({
      backgroundColor: colors.surface.base,
    });
  });
});
```

Acrescentar `import { colors } from '@/shared/ui/theme';` ao topo do arquivo de teste se ainda não
estiver lá.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/shared/ui/states.test.tsx
```

Esperado: FAIL — `Unable to find an element with testID: screen-scroll`.

- [ ] **Step 3: Reescrever o `Screen`**

Trocar o import do topo de `states.tsx`:

```tsx
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

Trocar o `Screen`:

```tsx
/**
 * O container de toda tela assinada, e o único lugar que trata as bordas do sistema.
 *
 * O Expo SDK 57 liga edge-to-edge no Android por padrão, então sem `insets.bottom` o fim de uma
 * lista nasce debaixo da barra de gestos. A parte de cima é do `TopBar`; daqui para baixo é aqui.
 *
 * Rola por padrão porque a alternativa é cada tela de formulário descobrir sozinha, uma de cada
 * vez, que não cabe num aparelho menor.
 */
export function Screen({ children }: { children: ReactNode }): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      // No Android o `windowSoftInputMode` já redimensiona a janela; no iOS não há equivalente.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.lg }]}
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
        testID="screen-scroll"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

No bloco `styles`, manter `screen` como está e acrescentar `content`:

```tsx
  screen: {
    backgroundColor: colors.surface.base,
    flex: 1,
    padding: space.lg,
  },
  /**
   * `flexGrow` e não `flex`: como `contentContainerStyle`, um `flex: 1` prende o conteúdo à altura
   * da viewport e a rolagem deixa de acontecer justamente quando passa a ser necessária.
   */
  content: {
    flexGrow: 1,
    padding: space.lg,
  },
```

O `padding` de `screen` permanece porque `Loading` usa `styles.screen` diretamente.

- [ ] **Step 4: Rodar a suíte inteira**

```bash
npm test
```

Esperado: PASS. As 16 telas usam `Screen` e seus testes olham `testID`/`accessibilityRole`, então
nenhum deve quebrar. Se algum falhar por não achar um elemento, é porque procurava por posição
dentro de um `View` que agora é um `ScrollView` — ajuste a consulta para `testID`, nunca o `Screen`.

- [ ] **Step 5: Verificar tipos e commitar**

```bash
npx tsc --noEmit
```

```bash
git add src/shared/ui/states.tsx src/shared/ui/states.test.tsx
git commit -m "feat(mobile): make Screen respect the system bars and the keyboard"
```

---

### Task 4: Os headers compartilhados e os Stacks aninhados

**Files:**
- Create: `src/features/navigation/ui/headers.tsx`
- Create: `app/(app)/income/_layout.tsx`
- Create: `app/(app)/expenses/_layout.tsx`
- Create: `app/(app)/recurring/_layout.tsx`
- Modify: `app/(app)/catalogue/_layout.tsx`
- Test: `src/features/navigation/ui/headers.test.tsx`

**Interfaces:**
- Consumes: `TopBar` da Task 1.
- Produces:
  - `stackHeader(args: { navigation: HeaderNavigation; options: { title?: string }; back?: unknown }): React.JSX.Element` — o `header` dos Stacks aninhados.
  - `drawerHeader(title: string): (args: { navigation: HeaderNavigation }) => React.JSX.Element` — o `header` do Resumo, que não tem Stack próprio.
  - `type HeaderNavigation = { goBack: () => void; dispatch: (action: { type: string }) => void }`.

O tipo de `dispatch` é `{ type: string }` e não `unknown` de propósito: o `dispatch` real recebe
`NavigationAction`, e só uma declaração mais larga que ela mantém `stackHeader` atribuível à opção
`header` do Stack. Com `unknown` a contravariância falha e o `tsc` reprova.

**Por que estes três `_layout.tsx` são obrigatórios:** sob um `Drawer`, cada arquivo de uma pasta
sem `_layout` vira um destino da gaveta. Sem eles, `/expenses/new` apareceria como item do menu em
vez de ser empilhado sobre Despesas.

- [ ] **Step 1: Escrever o teste que falha**

`src/features/navigation/ui/headers.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { drawerHeader, stackHeader } from '@/features/navigation/ui/headers';

const navigation = (): { goBack: jest.Mock; dispatch: jest.Mock } => ({
  goBack: jest.fn(),
  dispatch: jest.fn(),
});

describe('o header dos Stacks aninhados', () => {
  it('mostra voltar quando a tela foi empilhada, e volta ao ser tocado', () => {
    const nav = navigation();
    render(stackHeader({ navigation: nav, options: { title: 'Nova despesa' }, back: {} }));

    fireEvent.press(screen.getByTestId('top-bar-back'));

    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  it('mostra o menu na raiz do destino, e o abre pelo navegador ao ser tocado', () => {
    const nav = navigation();
    render(stackHeader({ navigation: nav, options: { title: 'Despesas' }, back: undefined }));

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(nav.dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });

  it('usa o título da rota', () => {
    render(stackHeader({ navigation: navigation(), options: { title: 'Pessoas' }, back: undefined }));

    expect(screen.getByText('Pessoas')).toBeTruthy();
  });
});

describe('o header do Resumo, que não tem Stack próprio', () => {
  it('mostra o menu e o título recebido', () => {
    const nav = navigation();
    render(drawerHeader('Resumo do mês')({ navigation: nav }));

    expect(screen.getByText('Resumo do mês')).toBeTruthy();

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(nav.dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/features/navigation/ui/headers.test.tsx
```

Esperado: FAIL — `Cannot find module '@/features/navigation/ui/headers'`.

- [ ] **Step 3: Escrever `headers.tsx`**

```tsx
import { TopBar } from '@/features/navigation/ui/TopBar';

/**
 * Como cada navegador monta o `TopBar`. Fica fora dos `_layout.tsx` porque são quatro Stacks
 * pedindo exatamente a mesma barra, e uma cópia por pasta é uma cópia que diverge.
 *
 * O tipo de `navigation` é declarado aqui, estruturalmente, em vez de importado do React
 * Navigation: o drawer do Expo Router é vendorizado e o seu `DrawerRouter` está documentado como
 * implementação interna, sujeita a mudar entre versões. Isto é o que precisamos dele e nada mais.
 */
export type HeaderNavigation = {
  goBack: () => void;
  dispatch: (action: { type: string }) => void;
};

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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx jest src/features/navigation/ui/headers.test.tsx
```

Esperado: PASS, 4 testes.

- [ ] **Step 5: Criar `app/(app)/income/_layout.tsx`**

```tsx
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
```

- [ ] **Step 6: Criar `app/(app)/expenses/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

import { stackHeader } from '@/features/navigation/ui/headers';
import { stackScreenOptions } from '@/shared/ui/theme';

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
      <Stack.Screen name="new" options={{ title: 'Nova despesa' }} />
      <Stack.Screen name="installment-plan" options={{ title: 'Nova compra parcelada' }} />
    </Stack>
  );
}
```

- [ ] **Step 7: Criar `app/(app)/recurring/_layout.tsx`**

```tsx
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
```

- [ ] **Step 8: Atualizar `app/(app)/catalogue/_layout.tsx`**

Substituir o corpo, mantendo o comentário existente e acrescentando os títulos:

```tsx
import { Stack } from 'expo-router';

import { stackHeader } from '@/features/navigation/ui/headers';
import { stackScreenOptions } from '@/shared/ui/theme';

/**
 * Makes `catalogue` one navigator carrying its menu and its three screens, the same pattern
 * `(auth)/_layout.tsx` established for the auth group.
 */
export default function CatalogueLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ ...stackScreenOptions, headerShown: true, header: stackHeader }}>
      <Stack.Screen name="index" options={{ title: 'Catálogo' }} />
      <Stack.Screen name="people" options={{ title: 'Pessoas' }} />
      <Stack.Screen name="categories" options={{ title: 'Categorias' }} />
      <Stack.Screen name="accounts" options={{ title: 'Contas' }} />
    </Stack>
  );
}
```

- [ ] **Step 9: Verificar tipos, rodar a suíte e commitar**

```bash
npx tsc --noEmit
```

```bash
npm test
```

```bash
git add src/features/navigation/ui/headers.tsx src/features/navigation/ui/headers.test.tsx "app/(app)/income/_layout.tsx" "app/(app)/expenses/_layout.tsx" "app/(app)/recurring/_layout.tsx" "app/(app)/catalogue/_layout.tsx"
git commit -m "feat(mobile): give each destination its own stack and header"
```

---

### Task 5: O `AppShell` vira o `Drawer`

**Files:**
- Modify: `src/features/navigation/ui/AppShell.tsx` (reescrita completa)
- Test: `src/features/navigation/ui/AppShell.test.tsx` (reescrita completa)

**Interfaces:**
- Consumes: `AppDrawer` (Task 2), `drawerHeader` (Task 4), tokens `colors.scrim` (Task 1).
- Produces: `AppShell(): React.JSX.Element` — o `Drawer` com os cinco destinos declarados.

Os dois testes de AUTH AC6 saem daqui: já foram para `AppDrawer.test.tsx` na Task 2. Este arquivo
passa a provar o que só ele pode provar — que os cinco destinos estão declarados no navegador e
que o dashboard é o índice do grupo.

- [ ] **Step 1: Reescrever o teste**

`src/features/navigation/ui/AppShell.test.tsx`, substituindo o arquivo inteiro:

```tsx
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import DashboardRoute from '../../../../app/(app)/index';

import { DashboardScreen } from '@/features/dashboard/ui/DashboardScreen';
import { AppShell } from '@/features/navigation/ui/AppShell';

/**
 * `Drawer` renderiza os filhos e cada `Drawer.Screen` vira um `View` carregando o seu `name` como
 * `testID` — o mesmo estilo de substituto que `CatalogueMenu.test.tsx` usa. Suficiente para provar
 * quais destinos o navegador declara, sem um container de navegação.
 *
 * O conteúdo da gaveta e o Sair são cobertos por `AppDrawer.test.tsx`, que é onde eles moram.
 */
jest.mock('expo-router/drawer', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  const Drawer = ({ children }: { children?: ReactNode }) =>
    react.createElement(rn.View, { testID: 'app-drawer' }, children);

  Drawer.Screen = ({ name }: { name: string }) =>
    react.createElement(rn.View, { testID: `screen-${name}` });

  return { Drawer };
});

describe('os destinos que o navegador declara (spec DASH AC1)', () => {
  it('declara resumo, receitas, despesas, recorrentes e catálogo', () => {
    render(<AppShell />);

    expect(screen.getByTestId('screen-index')).toBeTruthy();
    expect(screen.getByTestId('screen-income')).toBeTruthy();
    expect(screen.getByTestId('screen-expenses')).toBeTruthy();
    expect(screen.getByTestId('screen-recurring')).toBeTruthy();
    expect(screen.getByTestId('screen-catalogue')).toBeTruthy();
  });

  /**
   * O dashboard é o índice do grupo, então `/` resolve para ele e é onde um usuário assinado cai
   * quando a guarda raiz monta `(app)`. Asserir o export do próprio módulo de rota é a prova
   * disponível sem um container de navegação.
   */
  it('monta o dashboard como rota índice do grupo assinado', () => {
    expect(DashboardRoute).toBe(DashboardScreen);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx jest src/features/navigation/ui/AppShell.test.tsx
```

Esperado: FAIL — `Unable to find an element with testID: screen-index`, porque o `AppShell` ainda
renderiza a barra do rodapé.

- [ ] **Step 3: Reescrever o `AppShell`**

`src/features/navigation/ui/AppShell.tsx`, substituindo o arquivo inteiro:

```tsx
import { Drawer } from 'expo-router/drawer';

import { AppDrawer } from '@/features/navigation/ui/AppDrawer';
import { drawerHeader } from '@/features/navigation/ui/headers';
import { colors } from '@/shared/ui/theme';

/**
 * O navegador do app assinado: cinco destinos numa gaveta lateral.
 *
 * **Cada destino de pasta tem o seu próprio `Stack`** (`income/_layout.tsx` e companhia). Sem eles,
 * `/expenses/new` viraria um item da gaveta em vez de ser empilhado sobre Despesas — é assim que o
 * Expo Router trata um arquivo de pasta sem layout sob um `Drawer`.
 *
 * O Resumo é a exceção: é a rota índice do grupo, não tem Stack próprio, e por isso recebe a barra
 * superior daqui em vez de de um layout de pasta.
 *
 * `drawerType: 'front'` desliza a gaveta por cima da tela em vez de empurrá-la. É o que mantém o
 * conteúdo no lugar enquanto o menu está aberto.
 */
export function AppShell(): React.JSX.Element {
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
      <Drawer.Screen name="recurring" />
      <Drawer.Screen name="catalogue" />
    </Drawer>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npx jest src/features/navigation/ui/AppShell.test.tsx
```

Esperado: PASS, 2 testes.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
npm test
```

Se algum teste falhar por parse de ESM vindo de `react-native-drawer-layout`, acrescentar o pacote
ao `transformIgnorePatterns` de `jest.config.js`, dentro do grupo negado:

```js
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-drawer-layout|@sentry/react-native|native-base|react-native-svg))',
```

- [ ] **Step 6: Verificar tipos e commitar**

```bash
npx tsc --noEmit
```

```bash
git add src/features/navigation/ui/AppShell.tsx src/features/navigation/ui/AppShell.test.tsx jest.config.js
git commit -m "feat(mobile): replace the bottom bar with a side drawer"
```

---

### Task 6: Remover os títulos internos das 16 telas

**Files:**
- Modify, um `<Text style={styles.title}>` e o estilo `title` em cada:
  - `src/features/dashboard/ui/DashboardScreen.tsx:208`
  - `src/features/income/ui/IncomeMonthScreen.tsx:100`
  - `src/features/income/ui/RegisterIncomeSourceScreen.tsx`
  - `src/features/income/ui/RecordIncomePaymentScreen.tsx:75`
  - `src/features/income/ui/ChangeIncomeValueScreen.tsx`
  - `src/features/expenses/ui/ExpenseMonthScreen.tsx`
  - `src/features/expenses/ui/RegisterExpenseScreen.tsx:109`
  - `src/features/expenses/ui/RegisterInstallmentPlanScreen.tsx`
  - `src/features/recurring/ui/RecurringBillsScreen.tsx:70`
  - `src/features/recurring/ui/RegisterRecurringExpenseScreen.tsx`
  - `src/features/recurring/ui/RecordRecurringPaymentScreen.tsx`
  - `src/features/recurring/ui/ChangeRecurringValueScreen.tsx`
  - `src/features/catalogue/ui/CatalogueMenu.tsx:21`
  - `src/features/catalogue/ui/PeopleScreen.tsx:75`
  - `src/features/catalogue/ui/CategoriesScreen.tsx`
  - `src/features/catalogue/ui/AccountsScreen.tsx`

**Interfaces:**
- Consumes: os títulos de rota declarados na Task 4 e no `AppShell` da Task 5. Cada texto removido
  aqui já existe como `title` de uma rota — a lista da Task 4 é a fonte, e nenhuma string nova é
  introduzida.
- Produces: nada consumido por outra tarefa.

`src/features/auth/ui/AuthFrame.tsx` **não entra**: o título dele é uma prop e as telas de
autenticação ficam fora da gaveta.

- [ ] **Step 1: Confirmar que nenhum teste assere esses títulos**

```bash
npx jest --listTests >/dev/null && grep -rn "Resumo do mês\|Nova despesa\|Nova compra parcelada\|Nova fonte de renda\|Registrar recebimento\|Alterar valor\|Contas recorrentes\|Nova conta recorrente\|Pagamento de conta recorrente\|Alterar valor base\|Categorias\|Pessoas" --include=*.test.tsx src/
```

Esperado: nenhuma linha em que o texto seja o título de tela. Se alguma aparecer, essa asserção
migra para o `title` da rota correspondente em vez de ser apagada — anote qual antes de seguir.

- [ ] **Step 2: Remover o título de cada tela**

Em cada arquivo da lista: apagar a linha `<Text style={styles.title}>…</Text>` e a entrada
`title: { ... }` do `StyleSheet.create`. Nada mais muda.

Exemplo, em `RecurringBillsScreen.tsx:70`, o cabeçalho passa de duas peças para uma:

```tsx
        <Text style={styles.title}>Contas recorrentes</Text>
        <Link href="/recurring/new" style={styles.newLink}>
```

vira:

```tsx
        <Link href="/recurring/new" style={styles.newLink}>
```

Se a remoção deixar um `View` de cabeçalho com um filho só, deixe o `View` como está — ele carrega
`justifyContent: 'space-between'` e é o que mantém a ação alinhada à direita.

- [ ] **Step 3: Confirmar que sobrou nenhum título órfão**

```bash
grep -rn "styles.title" --include=*.tsx src/features
```

Esperado: apenas `src/features/auth/ui/AuthFrame.tsx`.

- [ ] **Step 4: Verificar tipos e rodar a suíte**

```bash
npx tsc --noEmit
```

Esperado: PASS. Um `title` deixado no `StyleSheet` sem uso não quebra o TypeScript, então o Step 3
é o que pega isso.

```bash
npm test
```

- [ ] **Step 5: Commitar**

```bash
git add src/features
git commit -m "refactor(mobile): move screen titles into the top bar"
```

---

### Task 7: Verificação no aparelho

**Files:** nenhum, a menos que a execução revele defeito.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 6.
- Produces: confirmação de que os dois pedidos do spec estão atendidos.

Esta tarefa existe porque nada nas anteriores prova o que o usuário pediu: os testes rodam sem
navegador de verdade e sem insets de verdade. Safe area, animação e o back do Android só se
verificam executando.

- [ ] **Step 1: Subir o backend e o app**

O backend precisa estar rodando — a correção de `UseHttpsRedirection` já está aplicada, mas o
processo precisa ser reiniciado para carregá-la.

```bash
npx expo run:android
```

- [ ] **Step 2: Conferir a lista de verificação**

Percorrer no emulador e confirmar cada item:

1. O `☰` aparece nas cinco telas principais e abre a gaveta deslizando pela esquerda.
2. A gaveta mostra o nome do usuário e marca o destino atual em azul.
3. Escolher um destino navega **e fecha a gaveta**.
4. O botão de voltar do Android fecha a gaveta quando ela está aberta, em vez de sair da tela.
5. Em `Despesas → Nova despesa`, a barra mostra `←`, e tanto ele quanto o back do Android voltam
   para a lista.
6. Nenhum texto nasce debaixo do relógio e da bateria.
7. O fim de uma lista longa não fica sob a barra de gestos do Android.
8. Num formulário, abrir o teclado permite rolar até o botão de salvar.
9. Nenhum flash branco ao navegar entre telas.
10. `Sair` na gaveta devolve à tela de entrada.

- [ ] **Step 3: Registrar o resultado**

Se tudo passar, marcar o spec como implementado:

```bash
git commit --allow-empty -m "test(mobile): verify the drawer and safe areas on device"
```

Se algum item falhar, **não seguir para ajustes direto**: usar a skill
`superpowers:systematic-debugging`, achar a causa raiz e só então corrigir.

---

## Notas de execução

- **Ordem importa.** Task 5 depende de 1, 2 e 4. Task 6 depende de 4 e 5 — remover os títulos antes
  de a barra existir deixa telas sem título nenhum.
- **Tasks 1, 2 e 3 são independentes** e podem ser feitas em paralelo por agentes distintos.
- O app roda hoje contra o backend em `http://10.0.2.2:5126/api`
  ([`httpClient.ts:16`](../../../src/shared/api/httpClient.ts)). A base de testes foi realinhada com
  esse endereço e com a capitalização real das rotas (`/Login`, `/User`) num commit próprio antes
  da Task 1, para que o branch começasse de uma base verde.
  ([`httpClient.ts:16`](../../../src/shared/api/httpClient.ts)). Os `console.log` de depuração nas
  linhas 72 e 74 desse arquivo são anteriores a este plano e não fazem parte dele.
