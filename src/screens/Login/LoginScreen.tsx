import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { authErrorMessages, useSignIn } from '@/hooks/useAuth';
import { AuthErrors, AuthFrame } from '@/components/AuthFrame';
import { Field, SubmitButton } from '@/components/form';

import { styles } from './LoginScreen.styles';

/**
 * Spec AUTH AC1 and AC7.
 *
 * Nothing here navigates on success: the route guard renders the `(app)` group the moment the
 * session becomes `signedIn`. And nothing resets on failure - the typed email survives a rejection,
 * so a mistyped password does not cost the user their address as well.
 */
export function LoginScreen(): React.JSX.Element {
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
