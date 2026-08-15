// `Screen` (src/shared/ui/states.tsx) reads `useSafeAreaInsets()`, and that hook throws unless a
// `SafeAreaProvider` is present. Most screen tests render without one - explicit providers are
// only needed where a test cares about a specific inset value (TopBar, AppDrawer). This mock is
// react-native-safe-area-context's own official test double: it answers with a zeroed inset
// instead of throwing when no provider wraps the render, and yields to a real provider when one
// is present.
//
// The mock file is authored as `export default {...}`; under this project's Babel/CJS interop
// that compiles to `{ default: {...} }` rather than the flat object, so it has to be unwrapped
// here - returning it as-is leaves every named export (`useSafeAreaInsets`, `SafeAreaProvider`,
// ...) undefined.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});
