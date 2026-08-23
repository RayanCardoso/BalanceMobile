import { Text, View } from 'react-native';

import { stateStyles } from './styles';

export function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={stateStyles.centered}>
      <Text style={stateStyles.message}>{message}</Text>
    </View>
  );
}
