import * as SecureStore from 'expo-secure-store';
import type { TrackingSession } from '../types';

const SESSION_KEY = 'active-tracking-session';
const ACCESS_TOKEN_KEY = 'api-access-token';

export async function getSession(): Promise<TrackingSession | null> {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as TrackingSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function saveSession(session: TrackingSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

// Replace the temporary setup UI with MSAL/OIDC and call this after sign-in.
export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}
