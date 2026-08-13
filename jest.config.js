/**
 * The gate for this project. `jest-expo` supplies the React Native environment and the Babel
 * transform; `transformIgnorePatterns` re-includes the RN stack, which ships untranspiled ESM and
 * would otherwise fail to parse inside `node_modules`.
 */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
};
