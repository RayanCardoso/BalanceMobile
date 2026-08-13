import { ApiError, UnauthorizedError } from '@/shared/api/ApiError';

/**
 * What the three catalogue screens render when a request is rejected.
 *
 * The API's pt-BR wording is passed through untouched (MAD-004). The app owns no copy of a rule the
 * server validates, so it owns no copy of the message either.
 */
export function apiMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.messages.length > 0) {
    return error.messages;
  }

  if (error instanceof UnauthorizedError && error.messages.length > 0) {
    return error.messages;
  }

  return [];
}

/**
 * The message an unreadable list shows above its retry.
 *
 * A failure the API described gets the API's own words; a failure it did not - a 500, a body that is
 * not JSON - gets the one sentence this module owns. Telling connectivity apart from validation is
 * spec UX AC5 and lands in T45's sweep.
 */
export function listErrorMessage(error: unknown): string {
  return apiMessages(error)[0] ?? 'Não foi possível carregar os dados.';
}
