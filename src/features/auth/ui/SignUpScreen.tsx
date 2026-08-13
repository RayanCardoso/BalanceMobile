import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { authErrorMessages, useSignUp } from '@/features/auth/api/useAuth';
import { Field, SubmitButton } from '@/shared/ui/form';
import { Screen } from '@/shared/ui/states';

/**
 * Spec AUTH AC2. Registering signs the new account straight in, so the guard moves to the `(app)`
 * group without a second trip through sign-in.
 *
 * The name, email and password rules belong to the API's `RegisterUserValidator` and stay there
 * (MAD-001). What comes back on a rejection is rendered as it arrived (MAD-004).
 */
export function SignUpScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUp = useSignUp();
  const messages = signUp.isError ? authErrorMessages(signUp.error) : [];

  return (
    <Screen>
      <Text style={styles.title}>Criar sua conta</Text>

      <Field label="Nome" onChangeText={setName} value={name} />
      <Field
        label="E-mail"
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        value={email}
      />
      <Field label="Senha" onChangeText={setPassword} value={password} />

      {messages.map((message, index) => (
        <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
          {message}
        </Text>
      ))}

      <SubmitButton
        label="Criar conta"
        onPress={() => {
          signUp.mutate({ name, email, password });
        }}
        pending={signUp.isPending}
      />

      <Link href="/sign-in" style={styles.link}>
        Já tenho uma conta
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
