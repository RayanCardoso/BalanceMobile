import { NetworkError } from '@/services/ApiError';

/**
 * Spec UX AC5 - "IF the API is unreachable THEN the system SHALL say so rather than reporting a
 * validation problem".
 *
 * This is the one user-facing sentence the API did not write, and it does not contradict MAD-004:
 * MAD-004 governs what the API *sent*, and a `NetworkError` means the request never arrived, so
 * there is nothing to be faithful to. Every other failure still shows the server's own words.
 *
 * It lives here once rather than in each feature's `errors.ts`. Those are deliberately separate
 * copies so no feature can retitle another's *API* messages; connectivity is not a feature's
 * message at all - it is the same fact about the device on every screen.
 */
export const CONNECTIVITY_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

/** The connectivity message when `fetch` itself failed, and null for every other failure. */
export function connectivityMessage(error: unknown): string | null {
  return error instanceof NetworkError ? CONNECTIVITY_MESSAGE : null;
}
