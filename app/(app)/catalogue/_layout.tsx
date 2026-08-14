import { Stack } from 'expo-router';

/**
 * Makes `catalogue` one navigator carrying its menu and its three screens, the same pattern
 * `(auth)/_layout.tsx` established for the auth group.
 */
export default function CatalogueLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
