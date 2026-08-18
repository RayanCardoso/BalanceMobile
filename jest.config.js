/**
 * The gate for this project. `jest-expo` supplies the React Native environment and the Babel
 * transform; `transformIgnorePatterns` re-includes the RN stack, which ships untranspiled ESM and
 * would otherwise fail to parse inside `node_modules`.
 */
module.exports = {
  preset: 'jest-expo',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  // jest.setup.js mocks react-native-safe-area-context (and stubs react-native-gesture-handler's
  // native module) project-wide, so individual tests don't have to.
  setupFiles: ['<rootDir>/jest.setup.js'],
  // .claude/worktrees holds isolated copies of the whole source tree that background agents work in.
  // Without this, Jest's haste map picks up every duplicate *.test.tsx inside them too, double- (or
  // triple-) counting every test in the suite and colliding on module names.
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  // The third of the three places `@/*` has to resolve. See babel.config.js.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Every component that draws an icon imports `lucide-react-native`, whose `react-native` export
    // condition is untranspiled ESM - under Jest that is `SyntaxError: Unexpected token 'export'`
    // and the suite dies before a test runs. The package ships a CJS build of the same icons, and
    // pointing at it is what the alternative (adding the package to `transformIgnorePatterns`)
    // cannot afford: the ESM entry re-exports some 1500 icon modules, and transforming all of them
    // takes a suite from 2 seconds to 48.
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg))',
  ],
};
