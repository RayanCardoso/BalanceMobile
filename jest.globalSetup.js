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
};
