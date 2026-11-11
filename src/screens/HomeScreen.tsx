import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { INITIAL_MUSICS } from '../data/initialMusics';
import { VideoItem, MusicItem, UserProfile } from '../types';
import { HeartButton } from '../components/HeartButton';
import { EmptyState } from '../components/EmptyState';
import { formatNumber } from '../utils/format';

const CATEGORY_ALIASES: Record<string, string[]> = {
  'Thú cưng': ['thú cưng', 'pets', 'thucung', 'cuncon', 'doglover'],
  'Thể thao': ['thể thao', 'sports', 'thethao', 'skateboard'],
  'Thiên nhiên': ['thiên nhiên', 'travel', 'thiennhien', 'dulich', 'daiduong', 'muadong'],
  'Ẩm thực': ['ẩm thực', 'cooking', 'amthuc', 'bepnhame'],
  'Giải trí': ['giải trí', 'art', 'streaming', 'giaitri', 'animation3d', 'livestream'],
  'Đời sống': ['đời sống', 'lifestyle', 'doisong', 'vlog', 'hoano'],
};

const CATEGORIES = [
  'Tất cả',
  'Thú cưng',
  'Thể thao',
  'Thiên nhiên',
  'Ẩm thực',
  'Giải trí',
  'Đời sống',
];

export const HomeScreen: React.FC = () => {
  const {
    videos,
    creators,
    currentUser,
    navigateTo,
    refreshVideos,
    setTab,
    openCreateWithMusic,
  } = useApp();
  const { theme } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshVideos();
    } finally {
      setRefreshing(false);
    }
  };

  const featuredVideo = videos[0];

  const filteredVideos =
    selectedCategory === 'Tất cả'
      ? videos
      : videos.filter((v) => {
          const keywords = CATEGORY_ALIASES[selectedCategory] || [
            selectedCategory.toLowerCase(),
          ];
          const catLower = (v.category || '').toLowerCase();
          return (
            keywords.some((kw) => catLower.includes(kw)) ||
            v.hashtags.some((h) =>
              keywords.some((kw) => h.toLowerCase().includes(kw))
            )
          );
        });

  const liveVideos = videos.filter((v) => v.isLive).concat(videos.slice(0, 3)).slice(0, 3);
  const audioList = INITIAL_MUSICS.slice(0, 4);

  const handleOpenVideo = (video: VideoItem) => {
    if (video.isLive) {
      navigateTo({ name: 'live', videoId: video.id });
    } else {
      navigateTo({ name: 'watch', videoId: video.id });
    }
  };

  const renderStoryItem = ({ item, index }: { item: UserProfile; index: number }) => {
    const isMe = item.id === currentUser.id || index === 0;

    return (
      <TouchableOpacity
        style={styles.storyItem}
        activeOpacity={0.8}
        onPress={() => {
          if (isMe) {
            setTab('profile');
          } else {
            navigateTo({ name: 'creator_profile', userId: item.id });
          }
        }}
      >
        <LinearGradient
          colors={isMe ? ['#06B6D4', '#3B82F6'] : theme.primaryGradient}
          style={styles.storyRing}
        >
          <Image
            source={{ uri: isMe ? currentUser.avatarUrl : item.avatarUrl }}
            style={[styles.storyAvatar, { borderColor: theme.surface }]}
          />
          {isMe && (
            <View style={[styles.addStoryBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="add" size={12} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
        <Text
          style={[styles.storyName, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {isMe ? 'Kênh của bạn' : item.displayName.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* 1. Thanh Nhà sáng tạo nổi bật */}
      <View
        style={[
          styles.storiesSection,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[currentUser, ...creators.filter((c) => c.id !== currentUser.id)]}
          keyExtractor={(item, idx) => item.id + '_' + idx}
          renderItem={renderStoryItem}
          contentContainerStyle={styles.storiesList}
        />
      </View>

      {/* 2. Hero Spotlight Video Banner */}
      {featuredVideo && (
        <View style={styles.heroWrapper}>
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.9}
            onPress={() => handleOpenVideo(featuredVideo)}
          >
            <Image
              source={{ uri: featuredVideo.thumbnailUrl }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['rgba(15,23,42,0.15)', 'rgba(15,23,42,0.9)']}
              style={styles.heroOverlay}
            >
              <View style={styles.heroTopRow}>
                <View style={[styles.spotlightTag, { backgroundColor: theme.primary }]}>
                  <Ionicons name="flame" size={12} color="#FFFFFF" />
                  <Text style={styles.spotlightTagText}>TÂM ĐIỂM HÔM NAY</Text>
                </View>
                <HeartButton videoId={featuredVideo.id} />
              </View>

              <View style={styles.heroBottomInfo}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {featuredVideo.title}
                </Text>
                <Text style={styles.heroDesc} numberOfLines={1}>
                  {featuredVideo.description}
                </Text>
                <View style={styles.heroFooter}>
                  <View style={styles.heroCreatorRow}>
                    <Image
                      source={{ uri: featuredVideo.creator.avatarUrl }}
                      style={styles.heroCreatorAvatar}
                    />
                    <Text style={styles.heroCreatorName}>
                      {featuredVideo.creator.displayName}
                    </Text>
                    <Text style={styles.heroDot}>•</Text>
                    <Text style={styles.heroStats}>
                      {formatNumber(featuredVideo.views)} lượt xem
                    </Text>
                  </View>
                  <View style={[styles.watchNowBtn, { backgroundColor: '#FFFFFF' }]}>
                    <Ionicons name="play" size={13} color={theme.navy} />
                    <Text style={[styles.watchNowText, { color: theme.navy }]}>
                      Phát ngay
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Bộ lọc danh mục (Category Chips) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: active ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Lưới Video Khám phá (2 cột có nút Thả tim trực tiếp - BT8.8) */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={18} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Khám phá Video ({filteredVideos.length})
          </Text>
        </View>
        <TouchableOpacity onPress={() => setTab('search')} activeOpacity={0.7}>
          <Text style={[styles.viewMoreText, { color: theme.primary }]}>
            Tìm kiếm nâng cao →
          </Text>
        </TouchableOpacity>
      </View>

      {filteredVideos.length === 0 ? (
        <EmptyState
          icon="film"
          title={`Chưa có video mục "${selectedCategory}"`}
          description="Danh mục này hiện chưa có video nào. Hãy khám phá tất cả video hoặc đăng tải video mới!"
          actionLabel="Xem tất cả video"
          onAction={() => setSelectedCategory('Tất cả')}
        />
      ) : (
        <View style={styles.videoGrid}>
          {filteredVideos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={[
                styles.videoCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              activeOpacity={0.88}
              onPress={() => handleOpenVideo(video)}
            >
              <View style={styles.cardThumbWrap}>
                <Image
                  source={{ uri: video.thumbnailUrl }}
                  style={styles.cardThumb}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(9,13,22,0.75)']}
                  style={styles.cardThumbScrim}
                />
                {/* Nút HeartButton đồng bộ MongoDB + AsyncStorage */}
                <View style={styles.cardHeartPos}>
                  <HeartButton videoId={video.id} size={17} />
                </View>

                {/* Thời lượng video */}
                <View style={styles.durationBadge}>
                  <Ionicons name="play" size={10} color="#FFFFFF" />
                  <Text style={styles.durationText}>{video.duration || '00:15'}</Text>
                </View>

                {/* Lượt xem & lượt thích */}
                <View style={styles.cardStatsBottom}>
                  <Text style={styles.cardStatText}>
                    👁 {formatNumber(video.views)}
                  </Text>
                  <Text style={styles.cardStatText}>
                    ♥ {formatNumber(video.likes)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text
                  style={[styles.cardTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {video.title}
                </Text>
                <TouchableOpacity
                  style={styles.cardCreatorRow}
                  onPress={() =>
                    navigateTo({ name: 'creator_profile', userId: video.creator.id })
                  }
                >
                  <Image
                    source={{ uri: video.creator.avatarUrl }}
                    style={styles.cardCreatorAvatar}
                  />
                  <Text
                    style={[styles.cardCreatorName, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {video.creator.displayName}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 5. Phòng Phát Trực Tiếp (Live Stream) */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.livePulseDot} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Phòng Live sôi động
          </Text>
        </View>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={liveVideos}
        keyExtractor={(item, idx) => 'live_' + item.id + '_' + idx}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.liveCard}
            activeOpacity={0.85}
            onPress={() => navigateTo({ name: 'live', videoId: item.id })}
          >
            <Image source={{ uri: item.thumbnailUrl }} style={styles.liveImg} />
            <View
              style={[
                styles.liveBadge,
                !item.isLive && { backgroundColor: '#5B4BFF' },
              ]}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {item.isLive ? 'TRỰC TIẾP' : 'PHÒNG LIVE'}
              </Text>
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(9,13,22,0.85)']}
              style={styles.liveScrim}
            >
              <Text style={styles.liveTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.liveViewerCount}>
                🔥 {formatNumber(item.liveViewerCount || item.views)} người đang xem
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      {/* 6. Kho Nhạc Nền Sáng Tạo */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="musical-notes" size={18} color={theme.accent} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Giai điệu Xu hướng
          </Text>
        </View>
        <TouchableOpacity onPress={() => setTab('create')} activeOpacity={0.7}>
          <Text style={[styles.viewMoreText, { color: theme.primary }]}>
            Dùng nhạc này →
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={audioList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }: { item: MusicItem }) => (
          <TouchableOpacity
            style={[
              styles.audioCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            activeOpacity={0.8}
            onPress={() => openCreateWithMusic(item.id)}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.audioCover} />
            <Text style={[styles.audioTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              style={[styles.audioArtist, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {item.artist} • {item.duration}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storiesList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 66,
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2.5,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    borderWidth: 2,
  },
  addStoryBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: {
    fontSize: 11,
    marginTop: 5,
    fontWeight: '600',
  },
  heroWrapper: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  heroCard: {
    width: '100%',
    height: 205,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    padding: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  spotlightTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroBottomInfo: {},
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  heroDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 10,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCreatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  heroCreatorName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroDot: {
    color: '#94A3B8',
    fontSize: 12,
  },
  heroStats: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  watchNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  watchNowText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  videoCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
  },
  cardThumbWrap: {
    width: '100%',
    aspectRatio: 0.82,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardThumb: {
    width: '100%',
    height: '100%',
  },
  cardThumbScrim: {
    ...StyleSheet.absoluteFill,
  },
  cardHeartPos: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardStatsBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardStatText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardCreatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  cardCreatorName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  liveCard: {
    width: 155,
    height: 195,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  liveImg: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  liveScrim: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 10,
  },
  liveTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  liveViewerCount: {
    color: '#F1F5F9',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  audioCard: {
    width: 124,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  audioCover: {
    width: 84,
    height: 84,
    borderRadius: 12,
    marginBottom: 8,
  },
  audioTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  audioArtist: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
