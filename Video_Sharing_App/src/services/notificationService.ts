import { api } from '../api/client';
import { AppNotification } from '../types';
import { StorageService } from './storageService';

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const list = await api.get<AppNotification[]>('/api/notifications', {
      params: { userId },
    });
    await StorageService.saveNotifications(list);
    return list;
  } catch {
    return StorageService.getNotifications();
  }
}

export async function markAsRead(id: string): Promise<AppNotification> {
  try {
    const updated = await api.patch<AppNotification>(`/api/notifications/${id}`, {
      read: true,
    });
    const list = await StorageService.getNotifications();
    await StorageService.saveNotifications(
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    return updated;
  } catch {
    const list = await StorageService.getNotifications();
    const next = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    await StorageService.saveNotifications(next);
    const found = next.find((n) => n.id === id);
    if (!found) throw new Error('Không tìm thấy thông báo');
    return found;
  }
}

export const fetchNotifications = getNotifications;
export const markNotificationRead = markAsRead;
