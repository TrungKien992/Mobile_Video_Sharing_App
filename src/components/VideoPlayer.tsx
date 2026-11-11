import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Text,
  Animated,
  LayoutChangeEvent,
  GestureResponderEvent,
} from 'react-native';
import { useVideoPlayer, VideoView, VideoContentFit } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { VideoCacheService } from '../services/videoCacheService';
import { resolveMediaUrl } from '../api/client';
import { getCssFilterForId } from '../data/initialFilters';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  videoId?: string;
  isPlaying?: boolean;
  isLooping?: boolean;
  filterId?: string;
  filterOverlayColor?: string;
  resizeMode?: VideoContentFit;
  showControls?: boolean;
  bottomSafeOffset?: number;
  topSafeOffset?: number;
  onPress?: () => void;
  onDoubleTap?: () => void;
  onDurationDetected?: (formatted: string) => void;
}

function formatSeconds(sec: number): string {
  if (!sec || !isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  videoId,
  isPlaying = true,
  isLooping = true,
  filterId,
  filterOverlayColor,
  resizeMode = 'cover',
  showControls = true,
  bottomSafeOffset = 0,
  topSafeOffset = 0,
  onPress,
  onDoubleTap,
  onDurationDetected,
}) => {
  const resolvedVideoUrl = resolveMediaUrl(videoUrl);
  const resolvedThumbnailUrl = thumbnailUrl ? resolveMediaUrl(thumbnailUrl) : undefined;
  const cssFilter = getCssFilterForId(filterId);

  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const [paused, setPaused] = useState(!isPlaying);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [barWidth, setBarWidth] = useState(300);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showBurstHeart, setShowBurstHeart] = useState(false);

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
    setCurrentTimeSec(0);
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
      setCurrentTimeSec(currentTime || 0);
      if (duration && duration > 0) {
        setDurationSec(duration);
        onDurationDetected?.(formatSeconds(duration));
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

  const triggerHeartBurst = () => {
    setShowBurstHeart(true);
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1,
        friction: 4,
        tension: 110,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 280,
        delay: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setShowBurstHeart(false));
  };

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

  // Xử lý chạm 1 lần (Play/Pause) và chạm đúp (Thả tim)
  const handleVideoSurfaceTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 270;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      triggerHeartBurst();
      if (onDoubleTap) {
        onDoubleTap();
      }
    } else {
      lastTapRef.current = now;
      if (onDoubleTap) {
        singleTapTimerRef.current = setTimeout(() => {
          handleTogglePlay();
          singleTapTimerRef.current = null;
        }, DOUBLE_TAP_DELAY);
      } else {
        handleTogglePlay();
      }
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (Platform.OS === 'web' && webVideoRef.current) {
      webVideoRef.current.muted = nextMuted;
    }
  };

  // Xử lý tua nhanh (Seek) khi người dùng chạm vào thanh tiến trình
  const handleSeekByRatio = (ratio: number) => {
    const clamped = Math.min(1, Math.max(0, ratio));
    setProgress(clamped);

    if (Platform.OS === 'web' && webVideoRef.current) {
      const dur = webVideoRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        webVideoRef.current.currentTime = clamped * dur;
        setCurrentTimeSec(clamped * dur);
      }
    } else if (Platform.OS !== 'web') {
      try {
        const dur = player.duration || durationSec;
        if (dur && dur > 0) {
          player.currentTime = clamped * dur;
          setCurrentTimeSec(clamped * dur);
        }
      } catch {}
    }
  };

  const handleProgressBarLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setBarWidth(w);
  };

  const handleProgressBarPress = (e: GestureResponderEvent) => {
    const locationX = e.nativeEvent.locationX;
    if (barWidth > 0 && typeof locationX === 'number') {
      handleSeekByRatio(locationX / barWidth);
    }
  };

  const heartScale = heartAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1.25, 1],
  });

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
          onClick={handleVideoSurfaceTap}
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
            onLoadedMetadata={(e: any) => {
              const target = e.currentTarget as HTMLVideoElement;
              if (target && target.duration > 0 && isFinite(target.duration)) {
                setDurationSec(target.duration);
                onDurationDetected?.(formatSeconds(target.duration));
              }
            }}
            onTimeUpdate={(e: any) => {
              const target = e.currentTarget as HTMLVideoElement;
              if (target && target.duration > 0) {
                setCurrentTimeSec(target.currentTime);
                setDurationSec(target.duration);
                setProgress(target.currentTime / target.duration);
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
              filter: cssFilter,
            }}
          />
        </div>

        {/* Hiệu ứng Tim bùng nổ khi Double-tap */}
        {showBurstHeart && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burstHeartContainer,
              {
                opacity: heartAnim,
                transform: [{ scale: heartScale }, { rotate: '-10deg' }],
              },
            ]}
          >
            <Ionicons name="heart" size={104} color="#FF3366" />
          </Animated.View>
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

        {/* Hiển thị thời gian & Thanh tiến trình có thể chạm hoặc kéo trượt để Tua (Seekable & Scrubbable Progress Bar) */}
        {showControls ? (
          <View style={styles.seekSection}>
            {durationSec > 0 && (
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>
                  {formatSeconds(currentTimeSec)} / {formatSeconds(durationSec)}
                </Text>
              </View>
            )}
            <View
              onLayout={handleProgressBarLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                setIsScrubbing(true);
                handleProgressBarPress(e);
              }}
              onResponderMove={handleProgressBarPress}
              onResponderRelease={(e) => {
                handleProgressBarPress(e);
                setIsScrubbing(false);
              }}
              onResponderTerminate={() => setIsScrubbing(false)}
              style={styles.seekBarHitArea}
            >
              <View
                style={[
                  styles.progressBarTrack,
                  isScrubbing && { height: 8 },
                ]}
              >
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                <View
                  style={[
                    styles.progressThumb,
                    isScrubbing && { width: 16, height: 16, borderRadius: 8, top: -4, marginLeft: -8 },
                    { left: `${Math.min(98, Math.max(0, progress * 100))}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
    );
  }

  // Render trên Native thiết bị di động bằng expo-video
  return (
    <View style={styles.container}>
      <View style={styles.videoOnlyLayer}>
        {!hasError ? (
          <VideoView
            player={player}
            contentFit={resizeMode}
            nativeControls={false}
            style={StyleSheet.absoluteFill}
          />
        ) : resolvedThumbnailUrl ? (
          <Image
            source={{ uri: resolvedThumbnailUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.nativeFallbackBox}>
            <Ionicons name="videocam-outline" size={40} color="#94A3B8" />
          </View>
        )}

        {/* Lớp phủ bộ lọc chỉ áp dụng lên lớp Video */}
        {filterOverlayColor && filterOverlayColor !== 'transparent' && (
          <View
            pointerEvents="none"
            style={[styles.filterOverlay, { backgroundColor: filterOverlayColor }]}
          />
        )}
      </View>

      {/* Vùng chạm toàn màn hình để Play/Pause hoặc Chạm đúp thả tim */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleVideoSurfaceTap}
        style={StyleSheet.absoluteFill}
      />

      {/* Hiệu ứng Tim bùng nổ khi Double-tap */}
      {showBurstHeart && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burstHeartContainer,
            {
              opacity: heartAnim,
              transform: [{ scale: heartScale }, { rotate: '-10deg' }],
            },
          ]}
        >
          <Ionicons name="heart" size={104} color="#FF3366" />
        </Animated.View>
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
          style={[
            styles.muteButton,
            topSafeOffset > 0 && { top: topSafeOffset + 54 },
          ]}
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

      {/* Thanh tiến trình có thể chạm hoặc kéo trượt để Tua */}
      {showControls ? (
        <View style={[styles.seekSection, bottomSafeOffset > 0 && { bottom: bottomSafeOffset }]}>
          {durationSec > 0 && (
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>
                {formatSeconds(currentTimeSec)} / {formatSeconds(durationSec)}
              </Text>
            </View>
          )}
          <View
            onLayout={handleProgressBarLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              setIsScrubbing(true);
              handleProgressBarPress(e);
            }}
            onResponderMove={handleProgressBarPress}
            onResponderRelease={(e) => {
              handleProgressBarPress(e);
              setIsScrubbing(false);
            }}
            onResponderTerminate={() => setIsScrubbing(false)}
            style={styles.seekBarHitArea}
          >
            <View
              style={[
                styles.progressBarTrack,
                isScrubbing && { height: 8 },
              ]}
            >
              <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              <View
                style={[
                  styles.progressThumb,
                  isScrubbing && { width: 16, height: 16, borderRadius: 8, top: -4, marginLeft: -8 },
                  { left: `${Math.min(98, Math.max(0, progress * 100))}%` },
                ]}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
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
  videoOnlyLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  nativeFallbackBox: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFill,
  },
  burstHeartContainer: {
    position: 'absolute',
    zIndex: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
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
  seekSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 28,
  },
  timeBadge: {
    alignSelf: 'flex-end',
    marginRight: 14,
    marginBottom: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeBadgeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  seekBarHitArea: {
    paddingTop: 10,
    paddingBottom: 2,
    width: '100%',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    position: 'relative',
    justifyContent: 'center',
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
  progressThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5B4BFF',
    top: -3.5,
    marginLeft: -6,
  },
});
