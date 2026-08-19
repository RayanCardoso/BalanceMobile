import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';

import { bankColour, bankInitial } from '@/utils/bank';
import { card, radius, space, type } from '@/components/theme';
import type { Account } from '@/types/catalogue';

/**
 * Uma conta desenhada como cartão.
 *
 * É a única superfície do app que não é azul-marinho, e é deliberado: um cartão é reconhecido pela
 * cor antes de ser lido. A cor vem de `bankColour`, que entrega `fill` e `ink` juntos — todo texto
 * aqui usa `ink`, e é isso que mantém o amarelo do Banco do Brasil legível sem cálculo em runtime.
 *
 * `owner` chega de uma consulta diferente da que trouxe a conta. Quando ela ainda não respondeu — ou
 * falhou — o valor é null e **a linha do dono não é renderizada**. Um cartão não vira estado de erro
 * por causa de uma consulta que não é a dele.
 *
 * A marca d'água de pontos é decoração e nada mais: a API não guarda número de cartão, então não há
 * dígito nenhum em jogo. Ela existe para que o objeto na tela seja lido como cartão à primeira vista.
 *
 * A navegação é `router.push` num `Pressable`, e não `<Link asChild>`: o `asChild` envolve o filho
 * num Slot que só monta sob um container de navegação, e o cartão precisa poder ser renderizado
 * sozinho. É também como o menu da tela de Receitas já navega.
 */

/** `5` vira `05`: dois dígitos alinham "fecha 05 · vence 12" com "fecha 15 · vence 22". */
const day = (value: number): string => String(value).padStart(2, '0');

export function AccountCard({
  account,
  owner,
}: {
  account: Account;
  owner: string | null;
}): React.JSX.Element {
  const colour = bankColour(account.institution);
  const ink = { color: colour.ink };

  const days = [
    account.closingDay === null ? null : `fecha ${day(account.closingDay)}`,
    account.dueDay === null ? null : `vence ${day(account.dueDay)}`,
  ].filter((part) => part !== null);

  return (
    <Pressable
      accessibilityLabel={
        owner === null
          ? `${account.name}, ${account.institution}`
          : `${account.name}, ${account.institution}, de ${owner}`
      }
      accessibilityRole="button"
      onPress={() => {
        router.push('/accounts');
      }}
      style={[styles.card, { backgroundColor: colour.fill }]}
      testID={`account-card-${account.id}`}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.seal, { borderColor: colour.ink }]}>
            <Text style={[styles.sealLetter, ink]}>{bankInitial(account.institution)}</Text>
          </View>

          <Text numberOfLines={1} style={[styles.institution, ink]}>
            {account.institution}
          </Text>
        </View>

        <CreditCard color={colour.ink} size={18} />
      </View>

      <Text style={[styles.watermark, ink]} testID={`account-card-watermark-${account.id}`}>
        •••• •••• •••• ••••
      </Text>

      <View style={styles.footer}>
        <Text numberOfLines={1} style={[styles.name, ink]}>
          {account.name}
        </Text>

        <View style={styles.meta}>
          {owner === null ? null : (
            <Text
              numberOfLines={1}
              style={[styles.detail, ink]}
              testID={`account-card-owner-${account.id}`}
            >
              {owner}
            </Text>
          )}

          {days.length === 0 ? null : (
            <Text style={[styles.detail, ink]} testID={`account-card-days-${account.id}`}>
              {days.join(' · ')}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    height: card.height,
    justifyContent: 'space-between',
    padding: space.lg,
    width: card.width,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: space.sm,
  },
  /** Quadrado com raio de pílula: um selo, não um avatar. */
  seal: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: space.xl,
    justifyContent: 'center',
    width: space.xl,
  },
  sealLetter: {
    ...type.label,
  },
  institution: {
    ...type.label,
    flexShrink: 1,
  },
  watermark: {
    ...type.body,
    letterSpacing: 2,
  },
  footer: {
    gap: space.xs,
  },
  name: {
    ...type.heading,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  detail: {
    ...type.caption,
    flexShrink: 1,
  },
});
