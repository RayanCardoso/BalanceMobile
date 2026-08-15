import { Stack } from 'expo-router';

import { stackHeader } from '@/navigation/headers';
import { stackScreenOptions } from '@/components/theme';

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
