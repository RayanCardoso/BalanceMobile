/**
 * The four things a screen can be showing. Every list screen is built from these, which is what
 * makes UX-01 structural instead of something each screen has to remember: a screen that forgot its
 * empty state would have nothing to render at all.
 *
 * `ErrorState` takes its message from the caller. The API's own pt-BR copy is what reaches it
 * (MAD-004), so no wording is stored here - with the single exception in `connectivity.ts`, which
 * exists precisely because the API said nothing.
 */

export { Screen } from './Screen';
export { Loading } from './Loading';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { CONNECTIVITY_MESSAGE, connectivityMessage } from './connectivity';
