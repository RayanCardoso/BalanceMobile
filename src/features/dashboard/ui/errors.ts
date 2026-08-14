import { ApiError, UnauthorizedError } from '@/shared/api/ApiError';

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
