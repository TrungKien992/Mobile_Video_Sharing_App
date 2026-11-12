import { api } from '../api/client';
import { CommentItem, UserProfile } from '../types';
import { StorageService } from './storageService';

export async function getComments(
  videoId?: string,
  currentUserId?: string
): Promise<CommentItem[]> {
  try {
    const list = await api.get<CommentItem[]>('/api/comments', {
      params: { videoId, currentUserId },
    });
    if (!videoId) {
      await StorageService.saveComments(list);
    }
    return list;
  } catch {
    return StorageService.getComments(videoId);
  }
}

export async function addCommentApi(payload: {
  videoId: string;
  user: UserProfile;
  text: string;
  rating?: number;
}): Promise<CommentItem> {
  try {
    const created = await api.post<CommentItem>('/api/comments', {
      videoId: payload.videoId,
      userId: payload.user.id,
      text: payload.text.trim(),
      rating: payload.rating || 5,
    });
    // Đồng bộ cả vào AsyncStorage để offline vẫn còn
    await StorageService.addComment(
      payload.videoId,
      payload.text.trim(),
      payload.user,
      payload.rating || 5
    );
    return created;
  } catch {
    return StorageService.addComment(
      payload.videoId,
      payload.text.trim(),
      payload.user,
      payload.rating || 5
    );
  }
}

export async function toggleLikeCommentApi(
  commentId: string,
  userId: string
): Promise<{ isLiked: boolean; likesCount?: number }> {
  try {
    return await api.post<{ isLiked: boolean; likesCount: number }>(
      `/api/comments/${commentId}/like`,
      { userId }
    );
  } catch {
    return { isLiked: true };
  }
}

export async function deleteCommentApi(
  commentId: string,
  userId?: string
): Promise<boolean> {
  try {
    await api.delete(`/api/comments/${commentId}`, {
      data: { userId },
      params: { userId },
    });
    return true;
  } catch {
    return false;
  }
}
