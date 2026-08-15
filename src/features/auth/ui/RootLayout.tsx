import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { installSessionExpiry } from '@/features/auth/api/useSignOut';
import { createQueryClient, QueryProvider } from '@/shared/api/queryClient';
import { useSessionStore, type SessionStatus } from '@/shared/lib/sessionStore';
import { Loading } from '@/shared/ui/states';
import { stackScreenOptions } from '@/shared/ui/theme';

/**
 * The only thing standing between a signed-out user and the whole app.
 *
 * The session has three states and the guard reads all three, because the interesting one is
 * `loading`. Reading the token out of secure storage is asynchronous, so a two-state guard renders
 * the sign-in screen for the frame between mount and that read resolving - which is spec AUTH AC3
 * failing, visibly, on every cold start of a signed-in app. While `loading`, **neither** group is
 * mounted.
 */

/** One client for the whole tree. `signOut` clears it, so one account never reads another's data. */
export const queryClient = createQueryClient();

// Spec AUTH AC5: a 401 from any authorised request ends the session, which puts the guard below
// back on the auth group. Wired once, here, rather than per screen.
installSessionExpiry(queryClient);

export function SessionGate({ status }: { status: SessionStatus }): React.JSX.Element {
  if (status === 'loading') {
    return <Loading />;
  }

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export function RootLayout(): React.JSX.Element {
  const status = useSessionStore((state) => state.status);
  const restore = useSessionStore((state) => state.restore);

  // Spec AUTH AC3 and AC4: storage is read once at start, and which group renders follows from
  // what it held.
  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    // The drawer (AppShell.tsx, expo-router/drawer) is built on react-native-drawer-layout, which
    // needs a GestureHandlerRootView ancestor for its pan/swipe gesture to work on Android.
    // expo-router's own root doesn't provide one, so it lives here - the outermost element - to
    // cover the whole app, not just the drawer's own screens.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider client={queryClient}>
        {/* The app is dark everywhere, so the clock and battery above it have to be light - the
            system default is dark-on-dark and effectively invisible. */}
        <StatusBar style="light" />
        <SessionGate status={status} />
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
