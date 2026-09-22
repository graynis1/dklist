import * as SecureStore from "expo-secure-store";

/**
 * Native secure storage (iOS Keychain / Android Keystore via
 * expo-secure-store) for the mobile Bearer token - never AsyncStorage/
 * plain storage for anything credential-shaped. A single well-known key
 * is enough since this app only ever holds one signed-in account at a
 * time (no multi-account switching in scope yet).
 */
const TOKEN_KEY = "dklist_auth_token";

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
