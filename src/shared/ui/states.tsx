import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The four things a screen can be showing. Every list screen is built from these, which is what
 * makes UX-01 structural instead of something each screen has to remember: a screen that forgot its
 * empty state would have nothing to render at all.
 *
 * `ErrorState` takes its message from the caller. The API's own pt-BR copy is what reaches it
 * (MAD-004), so no wording is stored here.
 */

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
