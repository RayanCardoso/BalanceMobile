import { create } from 'zustand';

import { clearToken, getToken, setToken } from '@/utils/tokenStorage';

/**
 * The only client state the app holds. Everything that came from the API belongs to the Query
 * cache (MAD-002); this store holds the session and nothing else.
 *
 * `status` has three values, not two. Reading the token out of secure storage is asynchronous, so a
 * two-state store would report `signedOut` for the frame between mount and the read resolving - and
 * the route guard would flash the sign-in screen at a user who is signed in, every cold start. That
 * is spec AUTH AC3, and `loading` is what makes it satisfiable.
 */

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export type SessionState = {
  token: string | null;
  name: string | null;
  status: SessionStatus;
  /** Reads persisted storage once at startup and resolves `status` to one of the other two. */
  restore: () => Promise<void>;
  signIn: (token: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  name: null,
  status: 'loading',

  restore: async () => {
    const token = await getToken();

    if (token === null) {
      set({ token: null, status: 'signedOut' });
      return;
    }

    set({ token, status: 'signedIn' });
  },

  signIn: async (token, name) => {
    await setToken(token);
    set({ token, name, status: 'signedIn' });
  },

  signOut: async () => {
    await clearToken();
    set({ token: null, name: null, status: 'signedOut' });
  },
}));
