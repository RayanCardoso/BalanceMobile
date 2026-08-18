/**
 * Runs the whole suite under a non-UTC timezone.
 *
 * It has to happen here rather than inside a test: Jest sandboxes `process.env`, so assigning `TZ`
 * from a test never reaches V8 and the timezone silently stays put. This file runs in the real Jest
 * process before any worker is forked, so the workers inherit it.
 *
 * Pacific/Midway is UTC-11. A negative offset is the one that exposes the bug this app cares about:
 * `new Date('2026-08-21')` parses as UTC midnight and reads back as the 20th, which would record a
 * purchase on the wrong day. `src/shared/lib/dates.test.ts` asserts the offset really applied, so a
 * broken setup fails loudly instead of passing for the wrong reason.
 */
module.exports = async () => {
  process.env.TZ = 'Pacific/Midway';

  // The API base every stubbed request is registered under. `api.ts` reads this variable per call
  // and falls back to `localhost`, so without it the whole suite builds one URL and stubs another:
  // every fetch misses its stub, becomes a `NetworkError`, and the failure reads as a broken hook
  // rather than as an unset variable. Pinned here so a run does not depend on the developer's own
  // `.env` - the value only has to match what the tests stub.
  process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:5126/api';
};
