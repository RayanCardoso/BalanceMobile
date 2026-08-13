import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder entry route from the scaffold. T18 replaces this layer with the `(auth)` / `(app)`
 * route groups and the session guard, at which point this file goes.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Balance</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
