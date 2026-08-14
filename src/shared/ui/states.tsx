import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { NetworkError } from '@/shared/api/ApiError';

/**
 * The four things a screen can be showing. Every list screen is built from these, which is what
 * makes UX-01 structural instead of something each screen has to remember: a screen that forgot its
 * empty state would have nothing to render at all.
 *
 * `ErrorState` takes its message from the caller. The API's own pt-BR copy is what reaches it
 * (MAD-004), so no wording is stored here - with the single exception below, which exists precisely
 * because the API said nothing.
 */

/**
 * Spec UX AC5 - "IF the API is unreachable THEN the system SHALL say so rather than reporting a
 * validation problem".
 *
 * This is the one user-facing sentence the API did not write, and it does not contradict MAD-004:
 * MAD-004 governs what the API *sent*, and a `NetworkError` means the request never arrived, so
 * there is nothing to be faithful to. Every other failure still shows the server's own words.
 *
 * It lives here once rather than in each feature's `errors.ts`. Those are deliberately separate
 * copies so no feature can retitle another's *API* messages; connectivity is not a feature's
 * message at all - it is the same fact about the device on every screen.
 */
export const CONNECTIVITY_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

/** The connectivity message when `fetch` itself failed, and null for every other failure. */
export function connectivityMessage(error: unknown): string | null {
  return error instanceof NetworkError ? CONNECTIVITY_MESSAGE : null;
}

export function Screen({ children }: { children: ReactNode }): React.JSX.Element {
  return <View style={styles.screen}>{children}</View>;
}

export function Loading({ label = 'Carregando…' }: { label?: string }): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <ActivityIndicator testID="loading-indicator" />
      <Text style={styles.message}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.centered}>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryLabel}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
  },
  retry: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
