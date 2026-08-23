import { Pressable, Text, View } from 'react-native';

import { stateStyles } from './styles';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View style={stateStyles.centered}>
      <Text style={stateStyles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={stateStyles.retry}>
        <Text style={stateStyles.retryLabel}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}
