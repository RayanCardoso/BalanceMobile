import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * The only place in the app that knows the token is stored differently per platform.
 *
 * `expo-secure-store` is a native module with no web implementation: calling it from the browser
 * build throws, so `expo start --web` would die on the first read at startup. Web falls back to
 * `localStorage`, which is not a secure store - it is the browser's only option, and the web build
 * is a development surface, not a shipped one.
 */

const TOKEN_KEY = 'balance.token';

const isWeb = (): boolean => Platform.OS === 'web';

export async function getToken(): Promise<string | null> {
  if (isWeb()) {
    return globalThis.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (isWeb()) {
    globalThis.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Removes the entry. Writing an empty string would leave a stored token that reads as `''`. */
export async function clearToken(): Promise<void> {
  if (isWeb()) {
    globalThis.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
