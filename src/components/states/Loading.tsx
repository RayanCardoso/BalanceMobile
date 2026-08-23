import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/components/theme';

import { stateStyles } from './styles';

export function Loading({ label = 'Carregando…' }: { label?: string }): React.JSX.Element {
  return (
    <View style={[stateStyles.screen, stateStyles.centered]}>
      <ActivityIndicator color={colors.accent.base} testID="loading-indicator" />
      <Text style={stateStyles.message}>{label}</Text>
    </View>
  );
}
