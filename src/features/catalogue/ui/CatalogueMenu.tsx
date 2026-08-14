import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Spec CAT-01. Groups the three catalogue screens under one reachable surface.
 *
 * A menu rather than tabs: `Tabs` from `expo-router` needs `@react-navigation/bottom-tabs`, which is
 * not a dependency yet, and the app's real tab bar is T44's job. Adding that package here to build a
 * three-item sub-navigator that T44 supersedes would be the dependency doing T44's work early.
 */
export function CatalogueMenu(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo</Text>

      <Link href="/catalogue/people" style={styles.item}>
        Pessoas
      </Link>
      <Link href="/catalogue/categories" style={styles.item}>
        Categorias
      </Link>
      <Link href="/catalogue/accounts" style={styles.item}>
        Contas
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  item: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    padding: 14,
  },
});
