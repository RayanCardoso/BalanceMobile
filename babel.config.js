/**
 * The `@/*` alias has to resolve in three places or it breaks in one context only, which reads as a
 * mysterious failure: `tsconfig.json` for the compiler, this file for Metro, and `moduleNameMapper`
 * in `jest.config.js` for the test runner. The three lists must stay in step.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@/assets': './assets',
            '@': './src',
          },
        },
      ],
    ],
  };
};
