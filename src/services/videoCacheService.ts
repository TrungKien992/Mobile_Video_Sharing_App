import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoItem } from '../types';

interface PlaybackMetric {
  videoId: string;
  lastPositionMs: number;
  totalDurationMs: number;
  viewCount: number;
  completed: boolean;
  updatedAt: number;
}

const CACHE_METRICS_KEY = '@video_sharing_app_playback_metrics_v1';
const MEMORY_CACHE = new Map<string, VideoItem>();

export const VideoCacheService = {
  // Bộ nhớ đệm RAM (In-Memory Cache) cho video tải nhanh tức thì (Zero-latency)
  setVideoToMemory(video: VideoItem): void {
    MEMORY_CACHE.set(video.id, video);
  },

  getVideoFromMemory(videoId: string): VideoItem | undefined {
    return MEMORY_CACHE.get(videoId);
  },

  populateMemoryCache(videos: VideoItem[]): void {
    videos.forEach((v) => MEMORY_CACHE.set(v.id, v));
  },

  // Lưu vị trí xem video gần nhất (Resume Playback)
  async savePlaybackPosition(videoId: string, positionMs: number, durationMs: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CACHE_METRICS_KEY);
      const metrics: Record<string, PlaybackMetric> = stored ? JSON.parse(stored) : {};

      metrics[videoId] = {
        videoId,
        lastPositionMs: positionMs,
        totalDurationMs: durationMs,
        viewCount: (metrics[videoId]?.viewCount || 0) + 1,
        completed: durationMs > 0 && positionMs / durationMs > 0.9,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_METRICS_KEY, JSON.stringify(metrics));
    } catch (e) {
      console.warn('Lỗi lưu playback position cache:', e);
    }
  },

  // Lấy vị trí đã xem để tiếp tục phát (Resume)
  async getPlaybackPosition(videoId: string): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(CACHE_METRICS_KEY);
      if (stored) {
        const metrics: Record<string, PlaybackMetric> = JSON.parse(stored);
        const item = metrics[videoId];
        if (item && !item.completed) {
          return item.lastPositionMs;
        }
      }
      return 0;
    } catch (e) {
      return 0;
    }
  },

  // Mô phỏng kỹ thuật Prefetch video tiếp theo trong feed
  prefetchNextVideos(currentIndex: number, videoList: VideoItem[]): string[] {
    const nextVideos = videoList.slice(currentIndex + 1, currentIndex + 3);
    const prefetchedUrls: string[] = [];
    nextVideos.forEach((v) => {
      prefetchedUrls.push(v.videoUrl);
      this.setVideoToMemory(v);
    });
    return prefetchedUrls;
  },

  // Xóa cache khi người dùng cần giải phóng bộ nhớ
  async clearCache(): Promise<boolean> {
    try {
      MEMORY_CACHE.clear();
      await AsyncStorage.removeItem(CACHE_METRICS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },
};
