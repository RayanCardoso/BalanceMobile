import { clearToken, getToken, setToken } from '@/shared/lib/tokenStorage';
import type { SessionState } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const storage = {
  getToken: getToken as jest.MockedFunction<typeof getToken>,
  setToken: setToken as jest.MockedFunction<typeof setToken>,
  clearToken: clearToken as jest.MockedFunction<typeof clearToken>,
};

/**
 * The store is a module singleton, so each test loads a fresh copy. Resetting it with `setState`
 * instead would make the initial-status test assert the value the test itself had just written.
 */
const loadStore = () => {
  let store!: () => SessionState;

  jest.isolateModules(() => {
    const mod = require('@/shared/lib/sessionStore') as typeof import('@/shared/lib/sessionStore');
    store = mod.useSessionStore.getState;
  });

  return store;
};

beforeEach(() => {
  jest.clearAllMocks();
  storage.setToken.mockResolvedValue(undefined);
  storage.clearToken.mockResolvedValue(undefined);
});

describe('the session status', () => {
  it('starts as loading, before storage has been read', () => {
    const state = loadStore();

    expect(state().status).toBe('loading');
  });

  it('stays loading while the stored token is still being read', async () => {
    let release!: (token: string | null) => void;
    storage.getToken.mockReturnValue(
      new Promise<string | null>((resolve) => {
        release = resolve;
      })
    );

    const state = loadStore();
    const restoring = state().restore();

    // The read has been started and has not resolved: this is the frame the route guard renders on
    // a cold start, and reporting signedOut here is what would flash the sign-in screen.
    expect(state().status).toBe('loading');

    release('stored-token');
    await restoring;

    expect(state().status).toBe('signedIn');
  });

  it('becomes signedIn with the stored token when storage holds one', async () => {
    storage.getToken.mockResolvedValue('stored-token');

    const state = loadStore();
    await state().restore();

    expect(state().status).toBe('signedIn');
    expect(state().token).toBe('stored-token');
  });

  it('becomes signedOut when storage holds nothing', async () => {
    storage.getToken.mockResolvedValue(null);

    const state = loadStore();
    await state().restore();

    expect(state().status).toBe('signedOut');
    expect(state().token).toBeNull();
  });
});

describe('signIn', () => {
  it('persists the token so the next start restores the session', async () => {
    const state = loadStore();

    await state().signIn('fresh-token', 'Rayan');

    expect(storage.setToken).toHaveBeenCalledWith('fresh-token');
  });

  it('holds the token, the name and the signedIn status', async () => {
    const state = loadStore();

    await state().signIn('fresh-token', 'Rayan');

    expect(state().status).toBe('signedIn');
    expect(state().token).toBe('fresh-token');
    expect(state().name).toBe('Rayan');
  });
});

describe('signOut', () => {
  it('clears the persisted token so the next start lands on sign-in', async () => {
    storage.getToken.mockResolvedValue('stored-token');
    const state = loadStore();
    await state().restore();

    await state().signOut();

    expect(storage.clearToken).toHaveBeenCalled();
  });

  it('empties the token, the name and the status', async () => {
    const state = loadStore();
    await state().signIn('fresh-token', 'Rayan');

    await state().signOut();

    expect(state().status).toBe('signedOut');
    expect(state().token).toBeNull();
    expect(state().name).toBeNull();
  });
});
