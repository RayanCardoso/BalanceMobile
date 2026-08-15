/**
 * The gate for this project. `jest-expo` supplies the React Native environment and the Babel
 * transform; `transformIgnorePatterns` re-includes the RN stack, which ships untranspiled ESM and
 * would otherwise fail to parse inside `node_modules`.
 */
module.exports = {
  preset: 'jest-expo',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // .claude/worktrees holds isolated copies of the whole source tree that background agents work in.
  // Without this, Jest's haste map picks up every duplicate *.test.tsx inside them too, double- (or
  // triple-) counting every test in the suite and colliding on module names.
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  // The third of the three places `@/*` has to resolve. See babel.config.js.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg))',
  ],
};
