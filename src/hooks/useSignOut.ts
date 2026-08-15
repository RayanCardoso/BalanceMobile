import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { UnauthorizedError } from '@/services/ApiError';
import { useSessionStore } from '@/store/sessionStore';

/**
 * The two ways out of the app, and they end the same way.
 *
 * Clearing the token is not enough. The Query cache still holds the previous account's people,
 * categories and months, and the next account signing in on the same device would read them before
 * its own first request came back. Spec AUTH AC6 names both, so both happen here (MAD-002: anything
 * that came from the API lives in the cache, so ending a session means emptying it).
 */
export async function endSession(client: QueryClient): Promise<void> {
  await useSessionStore.getState().signOut();
  client.clear();
}

export function useSignOut(): () => Promise<void> {
  const client = useQueryClient();

  return useCallback(() => endSession(client), [client]);
}

/**
 * Spec AUTH AC5. The API issues a 60-minute token and ships no refresh endpoint, so a session ends
 * mid-use and the app finds out through a 401 on whatever it asked for next.
 *
 * `httpClient` already turns that into an `UnauthorizedError`; this is the single place that reacts
 * to it, for every query and every mutation at once. Per-screen handling would leave the one screen
 * nobody remembered showing an empty list instead of the sign-in form.
 *
 * The reaction is limited to a session that was actually signed in. A 401 answering `POST /login` is
 * the API rejecting a password, not an expired token - that one belongs to the sign-in screen and
 * its message (AUTH AC7).
 */
export function installSessionExpiry(client: QueryClient): void {
  const handle = (error: unknown): void => {
    if (!(error instanceof UnauthorizedError)) {
      return;
    }

    if (useSessionStore.getState().status !== 'signedIn') {
      return;
    }

    void endSession(client);
  };

  client.getQueryCache().config.onError = (error) => {
    handle(error);
  };

  client.getMutationCache().config.onError = (error) => {
    handle(error);
  };
}
