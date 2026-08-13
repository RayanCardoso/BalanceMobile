import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { clearToken, getToken, setToken } from '@/shared/lib/tokenStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const setPlatform = (os: string): void => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

/**
 * Both branches are exercised because only one of them ever runs in this test environment on its
 * own. `expo-secure-store` has no web implementation, so an unguarded call throws in the browser
 * build - and nothing in the native branch would ever reveal that.
 *
 * The web fake keeps a backing map rather than returning canned values, so `clearToken` is proved
 * by reading afterwards and getting null. A `setItem(key, '')` implementation would satisfy a
 * "removeItem was called"-free test while leaving a stored token that reads as an empty string.
 */
describe('tokenStorage on web', () => {
  let stored: Map<string, string>;
  let removeItem: jest.Mock;

  beforeEach(() => {
    stored = new Map();
    removeItem = jest.fn((key: string) => {
      stored.delete(key);
    });

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string): string | null => stored.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          stored.set(key, value);
        },
        removeItem,
      },
      configurable: true,
    });

    setPlatform('web');
  });

  it('reads back the token it stored', async () => {
    await setToken('web-token');

    await expect(getToken()).resolves.toBe('web-token');
  });

  it('reads null when nothing was stored', async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it('reads null after clearToken, not an empty string', async () => {
    await setToken('web-token');

    await clearToken();

    await expect(getToken()).resolves.toBeNull();
  });

  it('removes the entry on clearToken rather than overwriting it', async () => {
    await setToken('web-token');

    await clearToken();

    expect(removeItem).toHaveBeenCalledWith('balance.token');
  });

  it('never touches SecureStore, which has no web implementation', async () => {
    await setToken('web-token');
    await getToken();
    await clearToken();

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('tokenStorage on native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('ios');
  });

  it('reads the token SecureStore holds', async () => {
    secureStore.getItemAsync.mockResolvedValue('native-token');

    await expect(getToken()).resolves.toBe('native-token');
  });

  it('reads null when SecureStore holds nothing', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);

    await expect(getToken()).resolves.toBeNull();
  });

  it('writes the token to SecureStore under the token key', async () => {
    await setToken('native-token');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith('balance.token', 'native-token');
  });

  it('deletes the entry on clearToken rather than overwriting it', async () => {
    await clearToken();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('balance.token');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
