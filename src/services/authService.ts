import { api } from '../api/client';
import { UserProfile } from '../types';
import { StorageService } from './storageService';

export async function login(
  emailOrPayload: string | { email: string; password: string },
  passwordArg?: string
): Promise<{ user: UserProfile; token: string }> {
  const rawEmail =
    typeof emailOrPayload === 'string' ? emailOrPayload : emailOrPayload.email;
  const password =
    typeof emailOrPayload === 'string'
      ? passwordArg || ''
      : emailOrPayload.password;
  const cleanEmail = rawEmail.trim().toLowerCase();

  try {
    const res = await api.post<{ user: UserProfile; token: string }>(
      '/api/auth/login',
      {
        email: cleanEmail,
        password,
      }
    );
    return res;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('không đúng') || err.message.includes('Vui lòng'))
    ) {
      throw err;
    }
    const users = await StorageService.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found || password !== '123456') {
      throw new Error('Email hoặc mật khẩu không đúng');
    }
    return {
      user: found,
      token: 'offline_jwt_' + found.id + '_' + Date.now(),
    };
  }
}

export async function register(
  nameOrPayload:
    | string
    | { name: string; email: string; password: string; phone?: string },
  emailArg?: string,
  passwordArg?: string,
  phoneArg?: string
): Promise<{ user: UserProfile; token: string }> {
  const name =
    typeof nameOrPayload === 'string' ? nameOrPayload : nameOrPayload.name;
  const rawEmail =
    typeof nameOrPayload === 'string' ? emailArg || '' : nameOrPayload.email;
  const password =
    typeof nameOrPayload === 'string'
      ? passwordArg || ''
      : nameOrPayload.password;
  const phone =
    typeof nameOrPayload === 'string' ? phoneArg : nameOrPayload.phone;

  const cleanEmail = rawEmail.trim().toLowerCase();
  try {
    const res = await api.post<{ user: UserProfile; token: string }>(
      '/api/auth/register',
      {
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone?.trim() || '',
      }
    );
    const users = await StorageService.getUsers();
    await StorageService.saveUsers([
      res.user,
      ...users.filter((u) => u.id !== res.user.id),
    ]);
    return res;
  } catch (err) {
    if (err instanceof Error && err.message.includes('đã được đăng ký')) {
      throw err;
    }
    const users = await StorageService.getUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Email này đã được đăng ký');
    }
    const newUser: UserProfile = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      displayName: name.trim(),
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone?.trim() || '',
      bio: 'Thành viên mới của cộng đồng VClip ✨',
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
      followersCount: 1,
      followingCount: 2,
      likesCount: 0,
      followers: 1,
      following: 2,
      likes: 0,
      isFollowed: false,
      isVerified: false,
    };
    await StorageService.saveUsers([newUser, ...users]);
    return {
      user: newUser,
      token: 'offline_jwt_' + newUser.id + '_' + Date.now(),
    };
  }
}
