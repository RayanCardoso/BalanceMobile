import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { ApiError, UnauthorizedError } from '@/shared/api/ApiError';
import { post } from '@/shared/api/httpClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

/**
 * The two ways into the app. Both endpoints answer with the same body, and both put the issued token
 * into the session store, which persists it to secure storage (spec AUTH AC1, AC2).
 *
 * Neither hook navigates. The route guard in `app/_layout.tsx` renders the `(app)` group the moment
 * `status` becomes `signedIn`, so the screens stay free of routing decisions.
 */

export type SignInInput = { email: string; password: string };

export type SignUpInput = { name: string; email: string; password: string };

/** `ResponseRegisteredUserJson` - the same shape from `POST /login` and `POST /user`. */
export type AuthenticatedUser = { name: string; token: string };

const storeSession = (user: AuthenticatedUser): Promise<void> =>
  useSessionStore.getState().signIn(user.token, user.name);

export function useSignIn(): UseMutationResult<AuthenticatedUser, Error, SignInInput> {
  return useMutation({
    mutationFn: (input: SignInInput) => post<AuthenticatedUser>('/Login', input),
    onSuccess: storeSession,
  });
}

export function useSignUp(): UseMutationResult<AuthenticatedUser, Error, SignUpInput> {
  return useMutation({
    mutationFn: (input: SignUpInput) => post<AuthenticatedUser>('/User', input),
    onSuccess: storeSession,
  });
}

/**
 * What the auth screens render when a request is rejected.
 *
 * The API's own pt-BR wording comes first and is passed through untouched (MAD-004). A rejected
 * sign-in is a 401 and a rejected registration is a 400, so both types have to be read here or one
 * of the two screens would show nothing. Only when the response carried no messages at all does the
 * error's own text stand in.
 */
export function authErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.messages.length > 0) {
    return error.messages;
  }

  if (error instanceof UnauthorizedError && error.messages.length > 0) {
    return error.messages;
  }

  if (error instanceof Error && error.message !== '') {
    return [error.message];
  }

  return [];
}
