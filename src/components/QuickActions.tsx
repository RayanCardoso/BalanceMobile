import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Landmark, Tags, UserPlus, type LucideIcon } from 'lucide-react-native';

import { colors, control, space, type } from '@/components/theme';

/**
 * As três portas de cadastro do resumo.
 *
 * Elas existem porque o menu "Catálogo" deixou de existir: as telas de contas, pessoas e categorias
 * continuam inteiras, e estes círculos são agora a forma de chegar nelas. Um índice de três links não
 * justificava um destino próprio na gaveta; três alvos na tela inicial, sim.
 *
 * O círculo tem `control.size` de lado — o mesmo alvo de toque mínimo que o `TopBar` usa — e a
 * legenda embaixo é apoio, não o alvo. Por isso o `accessibilityLabel` está no `Pressable`: sem ele,
 * um leitor de tela anunciaria um botão sem nome e leria a legenda como texto solto ao lado.
 */

const ACTIONS: { href: Href; label: string; icon: LucideIcon }[] = [
  { href: '/accounts', label: 'Nova conta', icon: Landmark },
  { href: '/people', label: 'Nova pessoa', icon: UserPlus },
  { href: '/categories', label: 'Nova categoria', icon: Tags },
];

export function QuickActions(): React.JSX.Element {
  return (
    <View style={styles.row} testID="quick-actions">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link asChild href={href} key={label}>
          <Pressable accessibilityLabel={label} accessibilityRole="button" style={styles.action}>
            <View style={styles.circle}>
              <Icon color={colors.text.primary} size={20} />
            </View>

            <Text style={styles.label}>{label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: space.sm,
  },
  action: {
    alignItems: 'center',
    gap: space.sm,
  },
  /**
   * O raio é o próprio `control.size`: qualquer valor maior ou igual à metade do lado desenha um
   * círculo, e usar a medida do lado mantém o círculo redondo se o alvo de toque mudar de tamanho.
   */
  circle: {
    alignItems: 'center',
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.subtle,
    borderRadius: control.size,
    borderWidth: 1,
    height: control.size,
    justifyContent: 'center',
    width: control.size,
  },
  label: {
    ...type.caption,
    color: colors.text.secondary,
  },
});
