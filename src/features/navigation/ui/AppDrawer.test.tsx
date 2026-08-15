import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
let mockPathname = '/';

jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');
  type TextProps = React.ComponentProps<typeof rn.Text>;

  const Link = ({
    href,
    children,
    onPress,
    testID: componentTestID,
    style,
  }: {
    href: string;
    children: ReactNode;
    onPress?: () => void;
    testID?: string;
    style?: TextProps['style'];
  }) => {
    // Combine component's testID (if active) with the link href testID for test queries
    const testIDValue = componentTestID || `link-${href}`;
    return react.createElement(rn.Text, { testID: testIDValue, onPress, style }, children);
  };

  return { Link, usePathname: () => mockPathname };
});

const storageCleared = clearToken as jest.MockedFunction<typeof clearToken>;

let client = createTestQueryClient();

const renderDrawer = (props: { onNavigate?: () => void } = {}): void => {
  const Wrapper = createQueryWrapper(client);
  render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <Wrapper>
        <AppDrawer {...props} />
      </Wrapper>
    </SafeAreaProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/';
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
    mockPathname = '/income/new';
    renderDrawer();

    expect(screen.getByTestId('destination-active')).toHaveTextContent('Receitas');
  });

  it('marca o resumo apenas na raiz, e não em todo caminho que começa com /', () => {
    mockPathname = '/expenses';
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
