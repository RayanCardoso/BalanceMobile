import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { authErrorMessages, useSignUp } from '@/hooks/useAuth';
import { AuthErrors, AuthFrame } from '@/components/AuthFrame';
import { Field, SubmitButton } from '@/components/form';

import { styles } from './RegisterScreen.styles';

/**
 * Spec AUTH AC2. Registering signs the new account straight in, so the guard moves to the `(app)`
 * group without a second trip through sign-in.
 *
 * The name, email and password rules belong to the API's `RegisterUserValidator` and stay there
 * (MAD-001). What comes back on a rejection is rendered as it arrived (MAD-004).
 */
export function RegisterScreen(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUp = useSignUp();
  const messages = signUp.isError ? authErrorMessages(signUp.error) : [];

  return (
    <AuthFrame
      footer={
        <View style={styles.footer}>
          <Text style={styles.prompt}>Já é cadastrado?</Text>
          <Link href="/sign-in" style={styles.link}>
            Já tenho uma conta
          </Link>
        </View>
      }
      subtitle="Leva menos de um minuto."
      title="Criar sua conta"
    >
      <Field label="Nome" onChangeText={setName} placeholder="Como devemos te chamar" value={name} />
      <Field label="E-mail" onChangeText={setEmail} placeholder="voce@exemplo.com" value={email} />
      {/* Spec AUTH-01. The only masked field on this screen: name and e-mail stay readable. */}
      <Field
        label="Senha"
        onChangeText={setPassword}
        placeholder="Mínimo de 6 caracteres"
        secure
        value={password}
      />

      <AuthErrors messages={messages} />

      <SubmitButton
        label="Criar conta"
        onPress={() => {
          signUp.mutate({ name, email, password });
        }}
        pending={signUp.isPending}
      />
    </AuthFrame>
  );
}
