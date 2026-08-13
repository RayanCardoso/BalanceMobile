import { ApiError, NetworkError, UnauthorizedError } from '@/shared/api/ApiError';
import { useSessionStore } from '@/shared/lib/sessionStore';

/**
 * The single boundary to the API. Nothing above this module sees a `Response`, a status code or the
 * bearer header, which is why two acceptance criteria can live here and nowhere else:
 *
 * - AUTH AC5: a 401 from any authorised request has to clear the session. It arrives as
 *   `UnauthorizedError`; T19 wires what acts on it.
 * - UX AC5: an unreachable API has to read as connectivity, not as a validation problem. A `fetch`
 *   rejection becomes `NetworkError`, which is a different type from `ApiError`.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT';

const DEFAULT_BASE_URL = 'http://localhost:5126/api';

/**
 * Read per call rather than captured at module load. A device cannot reach `localhost`, so the LAN
 * IP goes in `EXPO_PUBLIC_API_URL`; only the user knows it.
 */
const baseUrl = (): string => process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

const buildHeaders = (hasBody: boolean): Record<string, string> => {
  // The API ships its validation messages already localised, so the app never writes its own.
  const headers: Record<string, string> = { 'Accept-Language': 'pt-BR' };

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const { token } = useSessionStore.getState();

  if (token !== null) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/** Pulls `errorMessages` out of the API's error envelope, verbatim (MAD-004). */
const readErrorMessages = async (response: Response): Promise<string[]> => {
  try {
    const body: unknown = await response.json();

    if (typeof body === 'object' && body !== null && 'errorMessages' in body) {
      const messages = (body as { errorMessages: unknown }).errorMessages;

      if (Array.isArray(messages)) {
        return messages.map(String);
      }
    }
  } catch {
    // A response whose body is not JSON carries no message to show.
  }

  return [];
};

export async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const hasBody = body !== undefined;

  let response: Response;

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    // `fetch` rejected: the request never reached the API, so nothing was validated or rejected.
    throw new NetworkError();
  }

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (response.status === 204) {
    // No content. Typed through `T` because the caller's own response type declares the absence.
    return null as T;
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessages(response));
  }

  return (await response.json()) as T;
}

export const get = <T>(path: string): Promise<T> => request<T>('GET', path);
export const post = <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body);
export const put = <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body);
