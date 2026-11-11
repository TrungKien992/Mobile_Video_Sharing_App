import { UserProfile } from '../types';
import { saveJSON, loadJSON, removeKey } from './storage';

export const AUTH_STORAGE_KEY = '@vclip/auth';

export interface StoredAuth {
  user: UserProfile;
  token: string;
}

export async function saveAuth(
  userOrAuth: UserProfile | StoredAuth,
  token?: string
): Promise<void> {
  if ('user' in userOrAuth && 'token' in userOrAuth) {
    await saveJSON(AUTH_STORAGE_KEY, userOrAuth);
  } else {
    await saveJSON(AUTH_STORAGE_KEY, {
      user: userOrAuth,
      token: token || 'tk_' + userOrAuth.id,
    });
  }
}

export async function loadAuth(): Promise<StoredAuth | null> {
  return loadJSON<StoredAuth>(AUTH_STORAGE_KEY);
}

export async function clearAuth(): Promise<void> {
  await removeKey(AUTH_STORAGE_KEY);
}
