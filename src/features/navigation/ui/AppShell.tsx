import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSignOut } from '@/features/auth/api/useSignOut';
import { colors, space, stackScreenOptions, type } from '@/shared/ui/theme';

/**
 * The signed-in shell: the five destinations of the app and the way out of it.
 *
 * **Links, not `Tabs`.** `Tabs` from `expo-router` is a re-export of
 * `@react-navigation/bottom-tabs`, which is not a dependency of this project and is not even
 * present in `node_modules`. T24 already declined to add it for the catalogue's three-item
 * sub-menu; adding it here would mean a navigation package entering the project as a side effect of
 * a task about mounting a sign-out control. The destinations are what the criterion names, and a
 * link reaches each of them. Swapping this bar for a real tab bar later is a change to one file.
 *
 * The dashboard is `(app)/index`, so it is the group's index route: `/` resolves to it, and that is
 * where a signed-in user lands when the root guard mounts the group.
 *
 * **Sign-out lives here rather than on a screen** (spec AUTH AC6). `useSignOut` shipped in T19 with
 * no caller, which left the criterion reachable only from a test - the shell is the one surface
 * present on every signed-in screen, so mounting it here makes signing out reachable from all of
 * them at once.
 */
export function AppShell(): React.JSX.Element {
  const signOut = useSignOut();

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        <Stack screenOptions={stackScreenOptions} />
      </View>

      <View style={styles.bar}>
        <Link href="/" style={styles.destination}>
          Resumo
        </Link>
        <Link href="/income" style={styles.destination}>
          Receitas
        </Link>
        <Link href="/expenses" style={styles.destination}>
          Despesas
        </Link>
        <Link href="/recurring" style={styles.destination}>
          Recorrentes
        </Link>
        <Link href="/catalogue" style={styles.destination}>
          Catálogo
        </Link>

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
  shell: {
    backgroundColor: colors.surface.base,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  bar: {
    backgroundColor: colors.surface.raised,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  destination: {
    ...type.label,
    color: colors.text.secondary,
    fontSize: 14,
    paddingVertical: space.xs,
  },
  signOut: {
    paddingVertical: space.xs,
  },
  signOutLabel: {
    ...type.label,
    color: colors.accent.base,
    fontSize: 14,
  },
});
