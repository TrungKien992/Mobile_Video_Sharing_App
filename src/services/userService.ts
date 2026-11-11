import { api } from '../api/client';
import { UserProfile } from '../types';
import { StorageService } from './storageService';

export async function getUsers(currentUserId?: string): Promise<UserProfile[]> {
  try {
    const users = await api.get<UserProfile[]>('/api/users', {
      params: { currentUserId },
    });
    await StorageService.saveUsers(users);
    return users;
  } catch {
    return StorageService.getUsers();
  }
}

export async function updateProfile(
  id: string,
  data: Partial<Pick<UserProfile, 'name' | 'phone' | 'bio' | 'avatarUrl'>>
): Promise<UserProfile> {
  const payload = {
    ...data,
    displayName: data.name || undefined,
  };
  try {
    const updated = await api.patch<UserProfile>(`/api/users/${id}`, payload);
    const users = await StorageService.getUsers();
    await StorageService.saveUsers(
      users.map((u) => (u.id === id ? { ...u, ...updated, displayName: updated.name } : u))
    );
    return updated;
  } catch {
    const users = await StorageService.getUsers();
    let updatedUser: UserProfile | null = null;
    const nextUsers = users.map((u) => {
      if (u.id === id) {
        updatedUser = {
          ...u,
          ...data,
          name: data.name ?? u.name,
          displayName: data.name ?? u.displayName,
        };
        return updatedUser;
      }
      return u;
    });
    await StorageService.saveUsers(nextUsers);
    if (!updatedUser) throw new Error('Không tìm thấy tài khoản để cập nhật');
    return updatedUser;
  }
}

export async function toggleFollow(
  targetUserId: string,
  currentUserId: string
): Promise<{ isFollowed: boolean; followedUserIds: string[] }> {
  try {
    const res = await api.post<{
      isFollowed: boolean;
      followedUserIds: string[];
    }>(`/api/users/${targetUserId}/follow`, { currentUserId });
    await StorageService.saveFollowedUserIds(res.followedUserIds);
    return res;
  } catch {
    const local = await StorageService.toggleFollowUser(targetUserId);
    return {
      isFollowed: local.isFollowed,
      followedUserIds: local.allFollowedIds,
    };
  }
}
