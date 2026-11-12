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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoPlayer } from '../components/VideoPlayer';
import { CommentModal } from '../components/CommentModal';
import { AIVideoModal } from '../components/AIVideoModal';
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
    comments,
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
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 18 : Math.max(18, insets.top + 8);
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = videos.findIndex((v) => v.id === videoId);
    return idx >= 0 ? idx : 0;
  });

  const videosLengthRef = useRef(videos.length);
  videosLengthRef.current = videos.length;

  useEffect(() => {
    const idx = videos.findIndex((v) => v.id === videoId);
    if (idx >= 0) {
      setCurrentIndex(idx);
    }
  }, [videoId]);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const isModalOpenRef = useRef(false);
  isModalOpenRef.current = commentModalVisible || aiModalVisible;
  const [descExpanded, setDescExpanded] = useState(false);
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const discSpinAnim = useRef(new Animated.Value(0)).current;

  const currentVideo = videos[currentIndex] || videos[0];

  useEffect(() => {
    setDescExpanded(false);
  }, [currentIndex]);

  useEffect(() => {
    discSpinAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(discSpinAnim, {
        toValue: 1,
        duration: 5500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [discSpinAnim, currentVideo?.id]);

  const discRotate = discSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // KHÓA HOÀN TOÀN cử chỉ chuyển video khi đang mở modal bình luận hoặc modal AI
        if (isModalOpenRef.current) {
          return false;
        }
        // Không bắt cử chỉ vuốt khi người dùng đang bấm ở vùng thanh điều hướng trên cùng (Nút Quay lại)
        if (evt.nativeEvent.pageY < 96) {
          return false;
        }
        return (
          Math.abs(gestureState.dy) > 35 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_evt, gestureState) => {
        if (isModalOpenRef.current) return;
        const total = videosLengthRef.current;
        if (total <= 0) return;
        if (gestureState.dy < -45) {
          setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
        } else if (gestureState.dy > 45) {
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
      },
    })
  ).current;

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      toggleLikeVideo(currentVideo.id);
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
        bottomSafeOffset={bottomInset}
        topSafeOffset={topInset}
        filterId={currentVideo.filter}
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
      <View style={[styles.topBar, { top: topInset }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          activeOpacity={0.75}
        >
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
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
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
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Cột công cụ tương tác bên phải (Sidebar) */}
      <View style={[styles.rightActionsColumn, { bottom: 84 + bottomInset }]}>
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
          <Text style={styles.actionLabel}>
            {comments.filter((c) => c.videoId === currentVideo.id).length}
          </Text>
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

        {/* Nút Trợ lý Google AI (Tóm tắt, Dịch thuật & Gợi ý bình luận) */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setAiModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5B4BFF', '#EC4899']}
            style={styles.aiSideCircle}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionLabel}>AI</Text>
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

        {/* Đĩa nhạc Vinyl xoay liên tục chuẩn TikTok/Reels */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (currentVideo.music?.id && currentVideo.music.id !== 'none') {
              openCreateWithMusic(currentVideo.music.id);
              showToast(`Đã chọn nhạc: ${currentVideo.music.title} 🎵`, 'info');
            }
          }}
          style={styles.vinylDiscTouch}
        >
          <Animated.View
            style={[
              styles.vinylDiscOuter,
              { transform: [{ rotate: discRotate }] },
            ]}
          >
            <Image
              source={{
                uri:
                  currentVideo.music?.coverUrl ||
                  currentVideo.creator.avatarUrl,
              }}
              style={styles.vinylDiscCover}
            />
            <View style={styles.vinylCenterHole} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 4. Thông tin video ở góc dưới */}
      <View style={[styles.bottomInfoOverlay, { bottom: 24 + bottomInset }]}>
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

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setDescExpanded((prev) => !prev)}
        >
          <Text
            style={styles.videoDescription}
            numberOfLines={descExpanded ? 8 : 2}
          >
            {currentVideo.description}
          </Text>
          {(currentVideo.description || '').length > 65 && (
            <Text style={styles.readMoreText}>
              {descExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
            </Text>
          )}
        </TouchableOpacity>

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
            if (currentVideo.music?.id && currentVideo.music.id !== 'none') {
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
            {currentVideo.music?.id === 'none' || !currentVideo.music?.title
              ? `Âm thanh gốc - ${currentVideo.creator.displayName}`
              : `${currentVideo.music.title} - ${currentVideo.music.artist}`}
          </Text>
          {currentVideo.music?.id && currentVideo.music.id !== 'none' && (
            <View style={styles.useSoundChip}>
              <Text style={styles.useSoundText}>Dùng nhạc</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 5. Modal bình luận & Modal Google AI */}
      <CommentModal
        visible={commentModalVisible}
        videoId={currentVideo.id}
        onClose={() => setCommentModalVisible(false)}
      />

      <AIVideoModal
        visible={aiModalVisible}
        video={currentVideo}
        onClose={() => setAiModalVisible(false)}
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
    width: 48,
    height: 48,
    marginBottom: 20,
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
    bottom: -10,
    left: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  actionBtn: {
    alignItems: 'center',
  },
  aiSideCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  vinylDiscTouch: {
    marginTop: 4,
  },
  vinylDiscOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    borderWidth: 7,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  vinylDiscCover: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  vinylCenterHole: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
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
    marginBottom: 4,
  },
  readMoreText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
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
