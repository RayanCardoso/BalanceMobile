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

// GestureHandlerRootView (wrapped around the whole app in RootLayout.tsx, for the drawer's swipe
// gesture) calls into a native module on mount. This is react-native-gesture-handler's own test
// setup: it stubs that native module out, so rendering the root under test doesn't throw.
require('react-native-gesture-handler/jestSetup');

// O picker de data é um módulo nativo: sob o Jest ele não tem implementação e o render estoura.
//
// O substituto expõe um alvo por evento — escolher e cancelar — para que uma tela use o campo de
// data sem repetir o mock. Qual data ele devolve é decidido por `globalThis.__pickDate`: um teste
// que precisa de uma data diferente da que o campo já mostra a escreve ali antes de tocar em
// "escolher"; sem isso o substituto devolve o valor que recebeu, que é o comportamento de quem abre
// o calendário e confirma sem mexer.
//
// `DateField.test.tsx` tem o seu próprio mock, mais detalhado, porque lá o assunto é o componente;
// aqui o assunto é só não derrubar as telas que o usam.
globalThis.__pickDate = null;

jest.mock('@react-native-community/datetimepicker', () => {
  const react = require('react');
  const rn = require('react-native');

  const chosen = (fallback) => {
    const wanted = globalThis.__pickDate;

    if (typeof wanted !== 'string') {
      return fallback;
    }

    const [year, month, day] = wanted.split('-').map(Number);

    // Construído pelos getters locais, nunca por `new Date(string)`, que é UTC — a mesma regra que
    // `src/utils/dates.ts` documenta e que este substituto tem de respeitar para não deslocar um dia.
    return new Date(year, month - 1, day);
  };

  return {
    __esModule: true,
    default: ({ onChange, value }) =>
      react.createElement(rn.View, { testID: 'native-picker' }, [
        react.createElement(rn.Text, {
          key: 'set',
          testID: 'native-picker-set',
          onPress: () => onChange({ type: 'set' }, chosen(value)),
        }),
        react.createElement(rn.Text, {
          key: 'dismiss',
          testID: 'native-picker-dismiss',
          onPress: () => onChange({ type: 'dismissed' }, undefined),
        }),
      ]),
  };
});
