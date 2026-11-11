import { api } from '../api/client';
import { VideoItem } from '../types';
import { StorageService } from './storageService';

export async function getVideos(currentUserId?: string): Promise<VideoItem[]> {
  try {
    const videos = await api.get<VideoItem[]>('/api/videos', {
      params: { currentUserId },
    });
    if (Array.isArray(videos) && videos.length > 0) {
      await StorageService.saveVideos(videos);
      return videos;
    }
    return StorageService.getVideos();
  } catch {
    return StorageService.getVideos();
  }
}

export async function createVideo(
  payload: Partial<VideoItem> & { creatorId?: string }
): Promise<VideoItem> {
  try {
    const created = await api.post<VideoItem>('/api/videos', payload);
    await StorageService.saveNewVideo(created);
    return created;
  } catch {
    const chosenMusic = payload.music;
    const resolvedMusic =
      chosenMusic && chosenMusic.id !== 'none'
        ? chosenMusic
        : {
            id: 'none',
            title: 'Âm thanh gốc',
            artist: payload.creator?.displayName || 'VClip Creator',
            duration: payload.duration || '00:20',
            audioUrl: '',
            coverUrl: payload.creator?.avatarUrl || '',
          };
    const fallbackVideo: VideoItem = {
      id: 'vid_' + Date.now(),
      title: payload.title || 'Video mới',
      description: payload.description || '',
      videoUrl: payload.videoUrl || '',
      thumbnailUrl: payload.thumbnailUrl || '',
      duration: payload.duration || '00:20',
      views: 0,
      likes: 0,
      commentsCount: 0,
      sharesCount: 0,
      creator: payload.creator!,
      hashtags: Array.isArray(payload.hashtags) ? payload.hashtags : [],
      music: resolvedMusic,
      createdAt: new Date().toISOString(),
      filter: payload.filter || 'none',
      category: payload.category || '',
      privacy: payload.privacy || 'all',
      commentsEnabled: payload.commentsEnabled !== false,
      isLiked: false,
      isBookmarked: false,
    };
    await StorageService.saveNewVideo(fallbackVideo);
    return fallbackVideo;
  }
}

export async function toggleLikeVideoApi(
  videoId: string,
  userId: string
): Promise<{ isLiked: boolean; likes?: number; likedVideoIds: string[] }> {
  try {
    const res = await api.post<{
      videoId: string;
      isLiked: boolean;
      likes: number;
      likedVideoIds: string[];
    }>(`/api/videos/${videoId}/like`, { userId });
    await StorageService.saveLikedVideoIds(res.likedVideoIds);
    return res;
  } catch {
    const local = await StorageService.toggleLikeVideo(videoId);
    return {
      isLiked: local.isLiked,
      likedVideoIds: local.allLikedIds,
    };
  }
}

export async function toggleBookmarkVideoApi(
  videoId: string,
  userId: string
): Promise<{ isBookmarked: boolean; bookmarkedVideoIds: string[] }> {
  try {
    const res = await api.post<{
      videoId: string;
      isBookmarked: boolean;
      bookmarkedVideoIds: string[];
    }>(`/api/videos/${videoId}/bookmark`, { userId });
    await StorageService.saveBookmarkedVideoIds(res.bookmarkedVideoIds);
    return res;
  } catch {
    const local = await StorageService.toggleBookmarkVideo(videoId);
    return {
      isBookmarked: local.isBookmarked,
      bookmarkedVideoIds: local.allBookmarkedIds,
    };
  }
}

export async function uploadMediaFile(
  fileOrAsset: File | { uri: string; name?: string; type?: string }
): Promise<string> {
  const res = await api.uploadFile(fileOrAsset);
  return res.url;
}
