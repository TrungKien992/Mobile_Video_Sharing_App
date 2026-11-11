import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppNotification,
  CommentItem,
  UserProfile,
  VideoDraft,
  VideoItem,
} from '../types';
import { INITIAL_VIDEOS } from '../data/initialVideos';
import { INITIAL_CREATORS, CURRENT_USER } from '../data/initialCreators';
import { INITIAL_COMMENTS } from '../data/initialComments';
import { api } from '../api/client';

export const STORAGE_KEYS = {
  VIDEOS: '@vclip_videos_v2',
  LIKED_VIDEOS: '@vclip_liked_videos_v2',
  BOOKMARKED_VIDEOS: '@vclip_bookmarked_videos_v2',
  FOLLOWED_USERS: '@vclip_followed_users_v2',
  COMMENTS: '@vclip_comments_v2',
  DRAFTS: '@vclip_drafts_v2',
  USERS: '@vclip_users_v2',
  CURRENT_USER: '@vclip_current_user_v2',
  NOTIFICATIONS: '@vclip_notifications_v2',
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    userId: 'user_demo',
    type: 'follow',
    title: 'Khánh Vy Travel đã bắt đầu theo dõi bạn 👋',
    body: 'Hãy ghé thăm trang cá nhân của Khánh Vy để xem các video du lịch mới nhất.',
    targetId: 'user_khanhvy',
    read: false,
    createdAt: '2026-11-10T10:30:00.000Z',
    target: { screen: 'creator_profile', creatorId: 'user_khanhvy' },
  },
  {
    id: 'notif_2',
    userId: 'user_demo',
    type: 'like',
    title: 'Video của bạn vừa đạt mốc 88.000 lượt xem 🎉',
    body: '"Đàn ngựa phi nước đại giữa thảo nguyên tuyết trắng" đang nhận được rất nhiều yêu thích.',
    targetId: 'vid_5',
    read: false,
    createdAt: '2026-11-10T09:15:00.000Z',
    target: { screen: 'watch', videoId: 'vid_5' },
  },
  {
    id: 'notif_3',
    userId: 'user_demo',
    type: 'upload',
    title: 'Trạm Thú Cưng Sài Gòn đã đăng video mới 🐶',
    body: 'Chú cún cưng nô đùa ngoài bãi biển đầy nắng và gió.',
    targetId: 'vid_2',
    read: true,
    createdAt: '2026-11-09T14:20:00.000Z',
    target: { screen: 'watch', videoId: 'vid_2' },
  },
];

export const StorageService = {
  async getVideos(currentUserId: string = 'user_demo'): Promise<VideoItem[]> {
    try {
      const remoteVideos = await api.get<VideoItem[]>('/api/videos', {
        params: { currentUserId },
      });
      if (Array.isArray(remoteVideos)) {
        await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(remoteVideos));
        return remoteVideos;
      }
    } catch {
      // Fallback sang AsyncStorage nếu offline
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.VIDEOS);
      if (stored) {
        const parsed: VideoItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(INITIAL_VIDEOS));
      return INITIAL_VIDEOS;
    } catch {
      return INITIAL_VIDEOS;
    }
  },

  async saveVideos(videos: VideoItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
    } catch {}
  },

  async saveNewVideo(newVideo: VideoItem): Promise<VideoItem[]> {
    let savedVideo = newVideo;
    try {
      const createdOnDb = await api.post<VideoItem>('/api/videos', {
        ...newVideo,
        creatorId: newVideo.creator.id,
      });
      if (createdOnDb && createdOnDb.id) {
        savedVideo = createdOnDb;
      }
    } catch {}

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.VIDEOS);
      const currentVideos: VideoItem[] = stored ? JSON.parse(stored) : INITIAL_VIDEOS;
      const updated = [
        savedVideo,
        ...currentVideos.filter((v) => v.id !== savedVideo.id),
      ];
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(updated));
      return updated;
    } catch {
      return [savedVideo, ...INITIAL_VIDEOS];
    }
  },

  async deleteVideo(videoId: string): Promise<VideoItem[]> {
    try {
      await api.delete(`/api/videos/${videoId}`);
    } catch {}

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.VIDEOS);
      const currentVideos: VideoItem[] = stored ? JSON.parse(stored) : INITIAL_VIDEOS;
      const updated = currentVideos.filter((v) => v.id !== videoId);
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(updated));
      return updated;
    } catch {
      return INITIAL_VIDEOS.filter((v) => v.id !== videoId);
    }
  },

  async incrementVideoView(videoId: string): Promise<number | undefined> {
    try {
      const res = await api.post<{ videoId: string; views: number }>(
        `/api/videos/${videoId}/view`,
        {}
      );
      return res?.views;
    } catch {
      return undefined;
    }
  },

  async getLikedVideoIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_VIDEOS);
      if (stored) return JSON.parse(stored);
      const defaults = ['vid_1', 'vid_3'];
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(defaults));
      return defaults;
    } catch {
      return ['vid_1', 'vid_3'];
    }
  },

  async saveLikedVideoIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(ids));
    } catch {}
  },

  async toggleLikeVideo(
    videoId: string,
    userId: string = 'user_demo'
  ): Promise<{ isLiked: boolean; allLikedIds: string[]; likesCount?: number }> {
    const likedIds = await this.getLikedVideoIds();
    const index = likedIds.indexOf(videoId);
    let updatedIds: string[];
    let isLiked = false;

    if (index >= 0) {
      updatedIds = likedIds.filter((id) => id !== videoId);
      isLiked = false;
    } else {
      updatedIds = [...likedIds, videoId];
      isLiked = true;
    }
    await this.saveLikedVideoIds(updatedIds);

    let likesCount: number | undefined;
    try {
      const res = await api.post<{
        isLiked: boolean;
        likes: number;
        likedVideoIds?: string[];
      }>(`/api/videos/${videoId}/like`, { userId });
      likesCount = res.likes;
      if (Array.isArray(res.likedVideoIds)) {
        updatedIds = res.likedVideoIds;
        isLiked = res.isLiked;
        await this.saveLikedVideoIds(updatedIds);
      }
    } catch {}

    return { isLiked, allLikedIds: updatedIds, likesCount };
  },

  async getBookmarkedVideoIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKED_VIDEOS);
      if (stored) return JSON.parse(stored);
      const defaults = ['vid_1', 'vid_4'];
      await AsyncStorage.setItem(
        STORAGE_KEYS.BOOKMARKED_VIDEOS,
        JSON.stringify(defaults)
      );
      return defaults;
    } catch {
      return ['vid_1', 'vid_4'];
    }
  },

  async saveBookmarkedVideoIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKED_VIDEOS, JSON.stringify(ids));
    } catch {}
  },

  async toggleBookmarkVideo(
    videoId: string,
    userId: string = 'user_demo'
  ): Promise<{ isBookmarked: boolean; allBookmarkedIds: string[] }> {
    const bookmarkedIds = await this.getBookmarkedVideoIds();
    const index = bookmarkedIds.indexOf(videoId);
    let updatedIds: string[];
    let isBookmarked = false;

    if (index >= 0) {
      updatedIds = bookmarkedIds.filter((id) => id !== videoId);
      isBookmarked = false;
    } else {
      updatedIds = [...bookmarkedIds, videoId];
      isBookmarked = true;
    }
    await this.saveBookmarkedVideoIds(updatedIds);

    try {
      const res = await api.post<{
        isBookmarked: boolean;
        bookmarkedVideoIds?: string[];
      }>(`/api/videos/${videoId}/bookmark`, { userId });
      if (Array.isArray(res.bookmarkedVideoIds)) {
        updatedIds = res.bookmarkedVideoIds;
        isBookmarked = res.isBookmarked;
        await this.saveBookmarkedVideoIds(updatedIds);
      }
    } catch {}

    return { isBookmarked, allBookmarkedIds: updatedIds };
  },

  async getFollowedUserIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.FOLLOWED_USERS);
      if (stored) return JSON.parse(stored);
      const defaults = INITIAL_CREATORS.filter((c) => c.isFollowed || c.isFollowing).map(
        (c) => c.id
      );
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWED_USERS, JSON.stringify(defaults));
      return defaults;
    } catch {
      return [];
    }
  },

  async saveFollowedUserIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWED_USERS, JSON.stringify(ids));
    } catch {}
  },

  async toggleFollowUser(
    targetUserId: string,
    currentUserId: string = 'user_demo'
  ): Promise<{ isFollowed: boolean; allFollowedIds: string[] }> {
    const followedIds = await this.getFollowedUserIds();
    const index = followedIds.indexOf(targetUserId);
    let updatedIds: string[];
    let isFollowed = false;

    if (index >= 0) {
      updatedIds = followedIds.filter((id) => id !== targetUserId);
      isFollowed = false;
    } else {
      updatedIds = [...followedIds, targetUserId];
      isFollowed = true;
    }
    await this.saveFollowedUserIds(updatedIds);

    try {
      const res = await api.post<{
        isFollowed: boolean;
        followedUserIds?: string[];
      }>(`/api/users/${targetUserId}/follow`, { currentUserId });
      if (Array.isArray(res.followedUserIds)) {
        updatedIds = res.followedUserIds;
        isFollowed = res.isFollowed;
        await this.saveFollowedUserIds(updatedIds);
      }
    } catch {}

    return { isFollowed, allFollowedIds: updatedIds };
  },

  async getComments(videoId?: string): Promise<CommentItem[]> {
    try {
      const remoteComments = await api.get<CommentItem[]>('/api/comments', {
        params: { videoId },
      });
      if (Array.isArray(remoteComments)) {
        if (!videoId) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.COMMENTS,
            JSON.stringify(remoteComments)
          );
        }
        return remoteComments;
      }
    } catch {}

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMENTS);
      const comments: CommentItem[] = stored ? JSON.parse(stored) : INITIAL_COMMENTS;
      if (videoId) {
        return comments.filter((c) => c.videoId === videoId);
      }
      return comments;
    } catch {
      return INITIAL_COMMENTS;
    }
  },

  async saveComments(comments: CommentItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    } catch {}
  },

  async addComment(
    videoId: string,
    text: string,
    user: UserProfile,
    rating = 5
  ): Promise<CommentItem> {
    let newComment: CommentItem = {
      id: 'cmt_' + Date.now(),
      videoId,
      user,
      rating,
      text,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      likes: 0,
      isLiked: false,
    };

    try {
      const created = await api.post<CommentItem>('/api/comments', {
        videoId,
        userId: user.id,
        user,
        text,
        rating,
      });
      if (created && created.id) {
        newComment = created;
      }
    } catch {}

    const stored = await AsyncStorage.getItem(STORAGE_KEYS.COMMENTS);
    const currentComments: CommentItem[] = stored
      ? JSON.parse(stored)
      : INITIAL_COMMENTS;
    const updated = [
      newComment,
      ...currentComments.filter((c) => c.id !== newComment.id),
    ];
    await this.saveComments(updated);
    return newComment;
  },

  async getUsers(currentUserId: string = 'user_demo'): Promise<UserProfile[]> {
    try {
      const remoteUsers = await api.get<UserProfile[]>('/api/users', {
        params: { currentUserId },
      });
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
        return remoteUsers;
      }
    } catch {}

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) return JSON.parse(stored);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_CREATORS));
      return INITIAL_CREATORS;
    } catch {
      return INITIAL_CREATORS;
    }
  },

  async getCreators(currentUserId: string = 'user_demo'): Promise<UserProfile[]> {
    return this.getUsers(currentUserId);
  },

  async saveUsers(users: UserProfile[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  },

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) return JSON.parse(stored);
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATIONS,
        JSON.stringify(INITIAL_NOTIFICATIONS)
      );
      return INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  async saveNotifications(list: AppNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    } catch {}
  },

  async getDrafts(): Promise<VideoDraft[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DRAFTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async saveDraft(draft: VideoDraft): Promise<VideoDraft[]> {
    try {
      const drafts = await this.getDrafts();
      const updated = [draft, ...drafts.filter((d) => d.id !== draft.id)];
      await AsyncStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
      return updated;
    } catch {
      return [draft];
    }
  },

  async deleteDraft(draftId: string): Promise<VideoDraft[]> {
    try {
      const drafts = await this.getDrafts();
      const updated = drafts.filter((d) => d.id !== draftId);
      await AsyncStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  async getCurrentUser(): Promise<UserProfile> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return CURRENT_USER;
  },

  async updateCurrentUser(partial: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getCurrentUser();
    let merged: UserProfile = {
      ...current,
      ...partial,
      name: partial.displayName || partial.name || current.name,
      displayName: partial.displayName || partial.name || current.displayName,
    };

    try {
      const updatedFromDb = await api.patch<UserProfile>(
        `/api/users/${merged.id}`,
        merged
      );
      if (updatedFromDb && updatedFromDb.id) {
        merged = { ...merged, ...updatedFromDb };
      }
    } catch {}

    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(merged));
    return merged;
  },
};
