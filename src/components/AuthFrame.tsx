import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/Brand';
import { colors, radius, space, type } from '@/components/theme';

/**
 * The shape both auth screens take: the mark, a card holding the form, and one way out at the
 * bottom. It lives here rather than being written twice so sign-in and sign-up cannot drift into
 * two different-looking front doors.
 *
 * The form scrolls and lifts above the keyboard. On a small phone the password field of the
 * registration form sits exactly where the keyboard opens, and a screen that does not move is a
 * screen where the user types blind.
 */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** The link to the other auth screen. Rendered outside the card, under it. */
  footer: ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BrandHeader tagline="Suas finanças em equilíbrio, mês a mês." />

          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>

          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The failure panel above the submit button. Empty in, nothing out. */
export function AuthErrors({ messages }: { messages: string[] }): React.JSX.Element | null {
  if (messages.length === 0) {
    return null;
  }

  return (
    <View style={styles.errors}>
      {messages.map((message, index) => (
        // The API's own pt-BR wording, rendered as it arrived (MAD-004).
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface.base,
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  content: {
    // `grow` rather than `flex`: the content centres itself on a tall screen and scrolls on a short
    // one, instead of being squeezed.
    flexGrow: 1,
    gap: space.xl,
    justifyContent: 'center',
    padding: space.lg,
    paddingVertical: space.xxl,
  },
  card: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
    fontSize: 20,
  },
  subtitle: {
    ...type.body,
    color: colors.text.secondary,
    marginBottom: space.xl,
    marginTop: space.xs,
  },
  errors: {
    backgroundColor: colors.status.negativeSoft,
    borderColor: colors.status.negative,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: space.xs,
    marginBottom: space.lg,
    padding: space.md,
  },
  error: {
    ...type.body,
    color: colors.status.negative,
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
  },
});
