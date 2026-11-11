import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Share,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoPlayer } from '../components/VideoPlayer';
import { CommentModal } from '../components/CommentModal';
import { useApp } from '../context/AppContext';
import { INITIAL_FILTERS } from '../data/initialFilters';
import { VideoCacheService } from '../services/videoCacheService';
import { confirmDialog, showMessage, showToast } from '../utils/dialog';
import { formatNumber } from '../utils/format';

interface VideoWatchingScreenProps {
  videoId: string;
}

export const VideoWatchingScreen: React.FC<VideoWatchingScreenProps> = ({ videoId }) => {
  const {
    videos,
    currentUser,
    likedVideoIds,
    bookmarkedVideoIds,
    followedUserIds,
    toggleLikeVideo,
    toggleBookmarkVideo,
    toggleFollowUser,
    incrementVideoView,
    openSearchWithQuery,
    openCreateWithMusic,
    deleteVideo,
    goBack,
    navigateTo,
  } = useApp();

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx >= 0 ? idx : 0;
  });

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const currentVideo = videos[currentIndex] || videos[0];

  // Tự động tăng lượt xem thực tế trên MongoDB khi mở xem video
  useEffect(() => {
    if (currentVideo?.id && !viewedIdsRef.current.has(currentVideo.id)) {
      viewedIdsRef.current.add(currentVideo.id);
      incrementVideoView(currentVideo.id);
    }
  }, [currentVideo?.id, incrementVideoView]);

  if (!currentVideo) {
    return null;
  }

  const isLiked = likedVideoIds.has(currentVideo.id);
  const isBookmarked = bookmarkedVideoIds.has(currentVideo.id);
  const isFollowed = followedUserIds.has(currentVideo.creator.id);
  const isOwnVideo = currentVideo.creator.id === currentUser.id;

  const activeFilterObj = INITIAL_FILTERS.find((f) => f.id === currentVideo.filter);

  // Prefetch video tiếp theo cho mượt mà
  VideoCacheService.prefetchNextVideos(currentIndex, videos);

  const handleNextVideo = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Cử chỉ vuốt dọc (Vertical Swipe) chuẩn TikTok / Reels để chuyển video
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 28 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy < -45) {
          setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
        } else if (gestureState.dy > 45) {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
      },
    })
  ).current;

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      toggleLikeVideo(currentVideo.id);
    } else {
      showToast('Bạn đã thả tim video này ❤️', 'heart');
    }
  };

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(currentVideo.videoUrl);
        }
        showToast('Đã sao chép liên kết video vào bộ nhớ tạm 🔗', 'success');
      } else {
        await Share.share({
          message: `Xem video "${currentVideo.title}" trên VClip: ${currentVideo.videoUrl}`,
          url: currentVideo.videoUrl,
        });
      }
    } catch {
      showToast('Đã sao chép liên kết chia sẻ video 🔗', 'info');
    }
  };

  const handleMoreOptions = async () => {
    if (isOwnVideo) {
      const ok = await confirmDialog(
        'Xóa video này?',
        `Bạn có chắc chắn muốn xóa video "${currentVideo.title}" khỏi hệ thống MongoDB không?`
      );
      if (ok) {
        await deleteVideo(currentVideo.id);
        goBack();
      }
    } else {
      showMessage(
        'Thông tin Video',
        `• Tiêu đề: ${currentVideo.title}\n• Tác giả: ${currentVideo.creator.displayName}\n• Bộ lọc: ${activeFilterObj?.nameVi || 'Gốc'}\n• Chất lượng: MP4 HD Stream\n• Lượt xem: ${formatNumber(currentVideo.views)}`
      );
    }
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 1. Video Player toàn màn hình kèm Tua tiến trình, Bộ lọc màu & Double-Tap Like */}
      <VideoPlayer
        videoUrl={currentVideo.videoUrl}
        thumbnailUrl={currentVideo.thumbnailUrl}
        videoId={currentVideo.id}
        isPlaying={true}
        isLooping={true}
        filterOverlayColor={activeFilterObj?.overlayColor}
        onDoubleTap={handleDoubleTapLike}
      />

      {/* Lớp phủ Gradient mờ ở chân để chữ đọc rõ ràng */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.4, 0.85]}
        style={styles.scrimGradient}
        pointerEvents="none"
      />

      {/* 2. Thanh điều hướng trên cùng */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.videoCounterPill}>
          <Ionicons name="swap-vertical" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
          <Text style={styles.videoCounterText}>
            Vuốt dọc • {currentIndex + 1} / {videos.length}
          </Text>
        </View>

        {/* Nút chuyển video nhanh (Trên / Dưới) */}
        <View style={styles.switchFeedBtns}>
          <TouchableOpacity
            style={styles.navFeedBtn}
            onPress={handlePrevVideo}
            disabled={currentIndex === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-up"
              size={22}
              color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navFeedBtn}
            onPress={handleNextVideo}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Cột công cụ tương tác bên phải (Sidebar) */}
      <View style={styles.rightActionsColumn}>
        {/* Avatar tác giả + Nút Follow */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={() =>
              navigateTo({ name: 'creator_profile', userId: currentVideo.creator.id })
            }
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: currentVideo.creator.avatarUrl }}
              style={styles.creatorAvatar}
            />
          </TouchableOpacity>

          {!isOwnVideo && (
            <TouchableOpacity
              style={[
                styles.followPlusBadge,
                { backgroundColor: isFollowed ? '#10B981' : '#FF3366' },
              ]}
              onPress={() => toggleFollowUser(currentVideo.creator.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFollowed ? 'checkmark' : 'add'}
                size={13}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Thích (Heart) */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleLikeVideo(currentVideo.id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="heart"
            size={34}
            color={isLiked ? '#FF3366' : '#FFFFFF'}
          />
          <Text style={styles.actionLabel}>{formatNumber(currentVideo.likes)}</Text>
        </TouchableOpacity>

        {/* Nút Bình luận (Comment) */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setCommentModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={31} color="#FFFFFF" />
          <Text style={styles.actionLabel}>{currentVideo.commentsCount}</Text>
        </TouchableOpacity>

        {/* Nút Lưu / Bookmark */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleBookmarkVideo(currentVideo.id)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={31}
            color={isBookmarked ? '#F59E0B' : '#FFFFFF'}
          />
          <Text style={styles.actionLabel}>
            {isBookmarked ? 'Đã lưu' : 'Lưu'}
          </Text>
        </TouchableOpacity>

        {/* Nút Chia sẻ (Share) */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="arrow-redo" size={31} color="#FFFFFF" />
          <Text style={styles.actionLabel}>Chia sẻ</Text>
        </TouchableOpacity>

        {/* Tùy chọn thêm / Xóa video nếu là chủ sở hữu */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleMoreOptions}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isOwnVideo ? 'trash-outline' : 'ellipsis-horizontal'}
            size={24}
            color={isOwnVideo ? '#FCA5A5' : '#FFFFFF'}
          />
          {isOwnVideo && <Text style={styles.actionLabel}>Xóa</Text>}
        </TouchableOpacity>
      </View>

      {/* 4. Thông tin video ở góc dưới */}
      <View style={styles.bottomInfoOverlay}>
        <View style={styles.creatorHeaderRow}>
          <TouchableOpacity
            onPress={() =>
              navigateTo({ name: 'creator_profile', userId: currentVideo.creator.id })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.creatorHandle}>
              @{currentVideo.creator.username || currentVideo.creator.displayName}
            </Text>
          </TouchableOpacity>

          {!isOwnVideo && (
            <TouchableOpacity
              style={[
                styles.inlineFollowBtn,
                {
                  backgroundColor: isFollowed
                    ? 'rgba(255,255,255,0.22)'
                    : '#5B4BFF',
                },
              ]}
              onPress={() => toggleFollowUser(currentVideo.creator.id)}
            >
              <Text style={styles.inlineFollowText}>
                {isFollowed ? 'Đang theo dõi' : '+ Theo dõi'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.videoTitleText} numberOfLines={2}>
          {currentVideo.title}
        </Text>

        <Text style={styles.videoDescription} numberOfLines={2}>
          {currentVideo.description}
        </Text>

        {/* Danh sách Hashtags có thể bấm vào để tìm kiếm theo hashtag */}
        <View style={styles.hashtagsRow}>
          {currentVideo.hashtags.map((tag, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.75}
              onPress={() => openSearchWithQuery(tag)}
              style={styles.hashtagTouch}
            >
              <Text style={styles.hashtagItem}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nhạc nền đang phát - Bấm vào để dùng âm thanh này quay video mới */}
        <TouchableOpacity
          style={styles.musicRow}
          activeOpacity={0.8}
          onPress={() => {
            if (currentVideo.music?.id) {
              openCreateWithMusic(currentVideo.music.id);
              showToast(`Đã chọn nhạc: ${currentVideo.music.title} 🎵`, 'info');
            }
          }}
        >
          <Ionicons
            name="musical-notes"
            size={15}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.musicTitle} numberOfLines={1}>
            {currentVideo.music?.title} - {currentVideo.music?.artist}
          </Text>
          <View style={styles.useSoundChip}>
            <Text style={styles.useSoundText}>Dùng nhạc</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 5. Modal bình luận */}
      <CommentModal
        visible={commentModalVisible}
        videoId={currentVideo.id}
        onClose={() => setCommentModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  scrimGradient: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  videoCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  switchFeedBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  navFeedBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionsColumn: {
    position: 'absolute',
    right: 12,
    bottom: 84,
    alignItems: 'center',
    gap: 15,
    zIndex: 25,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  followPlusBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfoOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 78,
    zIndex: 25,
  },
  creatorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  creatorHandle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  inlineFollowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inlineFollowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  videoTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  videoDescription: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  hashtagTouch: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hashtagItem: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  musicTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 185,
  },
  useSoundChip: {
    marginLeft: 8,
    backgroundColor: 'rgba(91, 75, 255, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  useSoundText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
