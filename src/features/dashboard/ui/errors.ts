import { ApiError, UnauthorizedError } from '@/shared/api/ApiError';
import { connectivityMessage } from '@/shared/ui/states';

/**
 * What the dashboard renders when its request is rejected.
 *
 * The API's pt-BR wording reaches the screen untranslated (MAD-004). This mirrors the other
 * features' copies rather than importing one of them: each feature owns its own, so neither can
 * retitle the other's messages.
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
 * The message an unreadable month shows above its retry.
 *
 * A failure the API described gets the API's own words; a failure it did not - a 500, a body that is
 * not JSON - gets the one sentence this module owns.
 */
export function listErrorMessage(error: unknown): string {
  return apiMessages(error)[0] ?? 'Não foi possível carregar o mês.';
}
