import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Text,
} from 'react-native';
import { useVideoPlayer, VideoView, VideoContentFit } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { VideoCacheService } from '../services/videoCacheService';
import { resolveMediaUrl } from '../api/client';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  videoId?: string;
  isPlaying?: boolean;
  isLooping?: boolean;
  filterOverlayColor?: string;
  resizeMode?: VideoContentFit;
  showControls?: boolean;
  onPress?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  videoId,
  isPlaying = true,
  isLooping = true,
  filterOverlayColor,
  resizeMode = 'cover',
  showControls = true,
  onPress,
}) => {
  const resolvedVideoUrl = resolveMediaUrl(videoUrl);
  const resolvedThumbnailUrl = thumbnailUrl ? resolveMediaUrl(thumbnailUrl) : undefined;

  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  const [paused, setPaused] = useState(!isPlaying);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(
    Platform.OS === 'web' ? null : resolvedVideoUrl,
    (p) => {
      p.loop = isLooping;
      p.muted = isMuted;
      p.timeUpdateEventInterval = 0.25;
      if (isPlaying) {
        p.play();
      }
    }
  );

  useEffect(() => {
    setPaused(!isPlaying);
    setHasError(false);
    setProgress(0);
  }, [isPlaying, resolvedVideoUrl]);

  // Đồng bộ trạng thái Play/Pause, Mute, Loop trên thiết bị di động (expo-video)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch {}
  }, [paused, player]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      player.muted = isMuted;
    } catch {}
  }, [isMuted, player]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      player.loop = isLooping;
    } catch {}
  }, [isLooping, player]);

  // Khôi phục vị trí xem trước đó từ cache trên thiết bị di động
  useEffect(() => {
    if (Platform.OS === 'web' || !videoId) return;
    VideoCacheService.getPlaybackPosition(videoId).then((posMillis) => {
      if (posMillis > 0) {
        try {
          player.currentTime = posMillis / 1000;
        } catch {}
      }
    });
  }, [videoId, player]);

  // Lắng nghe tiến trình phát và lỗi từ expo-video
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const duration = player.duration;
      if (duration && duration > 0) {
        const prog = Math.min(1, Math.max(0, currentTime / duration));
        setProgress(prog);

        const posMillis = Math.floor(currentTime * 1000);
        if (videoId && posMillis % 3000 < 350) {
          VideoCacheService.savePlaybackPosition(
            videoId,
            posMillis,
            Math.floor(duration * 1000)
          );
        }
      }
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        setHasError(true);
      }
    });

    return () => {
      timeSub.remove();
      statusSub.remove();
    };
  }, [player, videoId]);

  const handleTogglePlay = () => {
    const nextPaused = !paused;
    setPaused(nextPaused);

    if (Platform.OS === 'web' && webVideoRef.current) {
      if (nextPaused) {
        webVideoRef.current.pause();
      } else {
        webVideoRef.current.play().catch(() => {});
      }
    }

    if (onPress) {
      onPress();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (Platform.OS === 'web' && webVideoRef.current) {
      webVideoRef.current.muted = nextMuted;
    }
  };

  // Render trên Web bằng HTML5 Video
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={handleTogglePlay}
        >
          {/* @ts-ignore */}
          <video
            key={resolvedVideoUrl}
            ref={(node: HTMLVideoElement | null) => {
              webVideoRef.current = node;
              if (node) {
                node.muted = isMuted;
                if (!paused) {
                  node.play().catch(() => {
                    node.muted = true;
                    setIsMuted(true);
                    node.play().catch(() => {});
                  });
                } else {
                  node.pause();
                }
              }
            }}
            src={resolvedVideoUrl}
            poster={resolvedThumbnailUrl}
            loop={isLooping}
            playsInline
            onTimeUpdate={(e: any) => {
              const target = e.currentTarget as HTMLVideoElement;
              if (target && target.duration > 0) {
                setProgress(target.currentTime / target.duration);
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Lớp phủ bộ lọc màu (Filter Effect) nếu có */}
        {filterOverlayColor && filterOverlayColor !== 'transparent' && (
          <View
            pointerEvents="none"
            style={[styles.filterOverlay, { backgroundColor: filterOverlayColor }]}
          />
        )}

        {/* Nút Play/Pause icon nổi khi tạm dừng */}
        {paused && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTogglePlay}
            style={styles.centerPlayButton}
          >
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={42} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Nút bật tắt âm thanh */}
        {showControls && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={handleToggleMute}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.muteText}>{isMuted ? 'Bật tiếng' : 'Có tiếng'}</Text>
          </TouchableOpacity>
        )}

        {/* Thanh tiến độ xem video (Progress line) */}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    );
  }

  // Render trên Native thiết bị di động bằng expo-video (Hỗ trợ đầy đủ Expo Go SDK 58)
  return (
    <View style={styles.container}>
      {!hasError ? (
        <VideoView
          player={player}
          contentFit={resizeMode}
          nativeControls={false}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image
          source={{
            uri:
              resolvedThumbnailUrl ||
              'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600',
          }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Vùng chạm toàn màn hình để Play/Pause trên điện thoại */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTogglePlay}
        style={StyleSheet.absoluteFill}
      />

      {/* Lớp phủ bộ lọc */}
      {filterOverlayColor && filterOverlayColor !== 'transparent' && (
        <View
          pointerEvents="none"
          style={[styles.filterOverlay, { backgroundColor: filterOverlayColor }]}
        />
      )}

      {/* Nút Play khi tạm dừng */}
      {paused && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTogglePlay}
          style={styles.centerPlayButton}
        >
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={42} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      )}

      {/* Nút bật/tắt tiếng */}
      {showControls && (
        <TouchableOpacity
          style={styles.muteButton}
          onPress={handleToggleMute}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.muteText}>{isMuted ? 'Bật tiếng' : 'Có tiếng'}</Text>
        </TouchableOpacity>
      )}

      {/* Thanh tiến trình */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFill,
  },
  centerPlayButton: {
    position: 'absolute',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  muteButton: {
    position: 'absolute',
    top: 72,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 15,
  },
  muteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5B4BFF',
  },
});
