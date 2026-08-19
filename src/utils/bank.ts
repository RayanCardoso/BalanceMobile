import { colors } from '@/components/theme';

/**
 * De `institution` — texto livre que a API guarda como o usuário digitou — para a cor do cartão.
 *
 * Duas etapas: normalizar o nome até o osso, e casar por **prefixo** contra as chaves de
 * `colors.bank`, da mais longa para a mais curta. Prefixo e não igualdade porque "Itaú Unibanco" e
 * "Caixa Econômica Federal" são o mesmo banco que "Itaú" e "Caixa"; da mais longa para a mais curta
 * porque, quando duas chaves compartilham começo, a mais específica tem de vencer.
 *
 * Sem casamento, um hash do nome escolhe da paleta de reserva. O hash é o que garante as duas coisas
 * que importam: o mesmo banco desconhecido não muda de cor a cada render, e dois bancos desconhecidos
 * diferentes não colapsam na mesma cor.
 */

export type BankColour = { fill: string; ink: string };

/** Ruído que não distingue um banco de outro e só atrapalha o casamento por prefixo. */
const NOISE = /\b(banco|bank|s\.?\s?a\.?|pagamentos|pagamento|financeira|de|do|da)\b/g;

/**
 * As chaves ordenadas da mais longa para a mais curta. Calculado uma vez, na carga do módulo: a
 * ordem é o que impede uma chave curta de sequestrar o nome de um banco que começa igual.
 */
const KEYS = (Object.keys(colors.bank) as (keyof typeof colors.bank)[]).sort(
  (left, right) => right.length - left.length
);

/** Minúsculas, sem acento, sem ruído e sem pontuação: "Banco Itaú S.A." vira "itau". */
const normalise = (institution: string): string =>
  institution
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(NOISE, ' ')
    .replace(/[^a-z0-9]/g, '');

/**
 * djb2 reduzido. Não precisa ser criptográfico — precisa ser **estável entre execuções**, que é
 * exatamente o que `Math.random` e a ordem de iteração de um `Set` não são.
 */
const hash = (value: string): number => {
  let total = 7;

  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 1000003;
  }

  return total;
};

export function bankColour(institution: string): BankColour {
  const name = normalise(institution);
  const known = name.length === 0 ? undefined : KEYS.find((key) => name.startsWith(key));

  if (known !== undefined) {
    return colors.bank[known];
  }

  return colors.bankFallback[hash(name) % colors.bankFallback.length]!;
}

/** A letra no selo do cartão. Uma interrogação quando a instituição chegou em branco. */
export function bankInitial(institution: string): string {
  const trimmed = institution.trim();

  return trimmed.length === 0 ? '?' : trimmed.charAt(0).toUpperCase();
}
