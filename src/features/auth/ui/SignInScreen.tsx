import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authErrorMessages, useSignIn } from '@/features/auth/api/useAuth';
import { AuthErrors, AuthFrame } from '@/features/auth/ui/AuthFrame';
import { Field, SubmitButton } from '@/shared/ui/form';
import { colors, space, type } from '@/shared/ui/theme';

/**
 * Spec AUTH AC1 and AC7.
 *
 * Nothing here navigates on success: the route guard renders the `(app)` group the moment the
 * session becomes `signedIn`. And nothing resets on failure - the typed email survives a rejection,
 * so a mistyped password does not cost the user their address as well.
 */
export function SignInScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useSignIn();
  const messages = signIn.isError ? authErrorMessages(signIn.error) : [];

  return (
    <AuthFrame
      footer={
        <View style={styles.footer}>
          <Text style={styles.prompt}>Ainda não tem conta?</Text>
          <Link href="/sign-up" style={styles.link}>
            Criar uma conta
          </Link>
        </View>
      }
      subtitle="Entre para acompanhar o seu mês."
      title="Bem-vindo de volta"
    >
      <Field label="E-mail" onChangeText={setEmail} placeholder="voce@exemplo.com" value={email} />
      {/* Spec AUTH-01. The only masked field on this screen: the e-mail stays readable, and a
          rejected sign-in leaves it in place (AC7). */}
      <Field label="Senha" onChangeText={setPassword} placeholder="Sua senha" secure value={password} />

      <AuthErrors messages={messages} />

      <SubmitButton
        label="Entrar"
        onPress={() => {
          signIn.mutate({ email, password });
        }}
        pending={signIn.isPending}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  prompt: {
    ...type.body,
    color: colors.text.muted,
  },
  link: {
    ...type.label,
    color: colors.accent.base,
    fontSize: 15,
  },
});
