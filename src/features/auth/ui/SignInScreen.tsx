import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authErrorMessages, useSignIn } from '@/features/auth/api/useAuth';
import { Field, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';

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
    <Screen>
      <Text style={styles.title}>Balance</Text>

      <Field
        label="E-mail"
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        value={email}
      />
      {/* Spec AUTH-01. The only masked field on this screen: the e-mail stays readable, and a
          rejected sign-in leaves it in place (AC7). */}
      <Field label="Senha" onChangeText={setPassword} secure value={password} />

      {messages.map((message, index) => (
        // The API's own pt-BR wording, rendered as it arrived (MAD-004).
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton
        label="Entrar"
        onPress={() => {
          signIn.mutate({ email, password });
        }}
        pending={signIn.isPending}
      />

      <Link href="/sign-up" style={styles.link}>
        Criar uma conta
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  error: {
    color: '#b3261e',
    fontSize: 14,
    marginBottom: 8,
  },
  link: {
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
});
