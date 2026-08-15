import { ApiError, UnauthorizedError } from '@/services/ApiError';
import { connectivityMessage } from '@/components/states';

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

  // Spec UX AC5. The request never reached the API, so nothing was validated and there is no server
  // wording to pass through. Falling through to the empty array is what left a submitted form
  // showing no message at all while the device was offline.
  const unreachable = connectivityMessage(error);

  if (unreachable !== null) {
    return [unreachable];
  }

  return [];
}

/**
 * The message an unreadable list shows above its retry.
 *
 * A failure the API described gets the API's own words; a failure it did not - a 500, a body that is
 * not JSON - gets the one sentence this module owns. An unreachable API is neither: it comes back
 * as the connectivity message above, which is what tells it apart from a validation problem.
 */
export function listErrorMessage(error: unknown): string {
  return apiMessages(error)[0] ?? 'Não foi possível carregar os dados.';
}
