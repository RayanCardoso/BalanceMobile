import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/shared/ui/theme';

/**
 * Makes `(auth)` one navigator rather than two loose routes, which is what lets the root guard
 * mount or drop the whole group by name.
 */
export default function AuthLayout(): React.JSX.Element {
  return <Stack screenOptions={stackScreenOptions} />;
}
