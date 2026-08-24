import { Link, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSignOut } from '@/hooks/useSignOut';
import { useSessionStore } from '@/store/sessionStore';
import { colors, radius, space, type } from '@/components/theme';

/**
 * O conteúdo da gaveta: os três destinos do app e a saída dele.
 *
 * O destino ativo sai de `usePathname`, não de estado guardado aqui. Um menu com o próprio
 * "selecionado" passaria a mentir na primeira vez que o usuário voltasse pelo botão do Android,
 * porque essa navegação não passa por este componente.
 *
 * Contas, Pessoas e Categorias **não** estão aqui. Continuam existindo como rotas, mas são
 * alcançadas pelos atalhos em círculo do resumo: um menu intermediário para três telas de cadastro
 * era navegação a mais para informação que cabe na tela inicial.
 *
 * **Sair mora aqui** (spec AUTH AC6). A gaveta é a superfície alcançável de qualquer tela
 * assinada, que é a mesma razão pela qual o controle vivia na barra do rodapé antes dela.
 */

const DESTINATIONS = [
  { href: '/', label: 'Resumo' },
  { href: '/income', label: 'Receitas' },
  { href: '/expenses', label: 'Despesas' },
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
            <View
              key={destination.href}
              testID={active ? 'destination-active' : undefined}
            >
              <Link
                href={destination.href}
                onPress={onNavigate}
                style={[styles.destination, active && styles.destinationActive]}
                testID={`link-${destination.href}`}
              >
                {destination.label}
              </Link>
            </View>
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
    color: colors.accent.text,
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
    color: colors.accent.text,
  },
});
