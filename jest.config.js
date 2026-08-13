/**
 * The gate for this project. `jest-expo` supplies the React Native environment and the Babel
 * transform; `transformIgnorePatterns` re-includes the RN stack, which ships untranspiled ESM and
 * would otherwise fail to parse inside `node_modules`.
 */
module.exports = {
  preset: 'jest-expo',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  // The third of the three places `@/*` has to resolve. See babel.config.js.
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
};
