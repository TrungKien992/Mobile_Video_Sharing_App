import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VideoItem, UserProfile } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { HeartButton } from '../components/HeartButton';
import { EmptyState } from '../components/EmptyState';
import { formatNumber } from '../utils/format';

type SearchCategoryTab = 'all' | 'trending' | 'accounts' | 'liked';

export const SearchScreen: React.FC = () => {
  const {
    videos,
    creators,
    likedVideoIds,
    followedUserIds,
    toggleFollowUser,
    navigateTo,
  } = useApp();
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  // Sử dụng useDebounce 300ms theo đúng Bài Thực Hành Buổi 8 (BT8.6)
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>('all');

  const query = debouncedQuery.toLowerCase().trim();

  // Lọc video theo từ khóa tìm kiếm đã debounce và tab
  const filteredVideos = videos.filter((v) => {
    if (activeTab === 'liked' && !likedVideoIds.has(v.id)) return false;
    if (!query) return true;
    const matchTitle = v.title.toLowerCase().includes(query);
    const matchDesc = v.description.toLowerCase().includes(query);
    const matchHashtags = v.hashtags.some((t) => t.toLowerCase().includes(query));
    const matchCreator = v.creator.displayName.toLowerCase().includes(query);
    const matchCategory = (v.category || '').toLowerCase().includes(query);
    return matchTitle || matchDesc || matchHashtags || matchCreator || matchCategory;
  });

  const sortedVideos =
    activeTab === 'trending'
      ? [...filteredVideos].sort((a, b) => b.views - a.views)
      : filteredVideos;

  const filteredCreators = creators.filter((c) => {
    if (!query) return true;
    return (
      c.displayName.toLowerCase().includes(query) ||
      c.username.toLowerCase().includes(query) ||
      (c.bio || '').toLowerCase().includes(query)
    );
  });

  const suggestedTags = [
    'thucung',
    'thethao',
    'thiennhien',
    'bienxanh',
    'hoathinh',
    'vclip',
    'xuhuong',
  ];

  const renderVideoGridItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={[
        styles.gridItem,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      activeOpacity={0.85}
      onPress={() => {
        if (item.isLive) {
          navigateTo({ name: 'live', videoId: item.id });
        } else {
          navigateTo({ name: 'watch', videoId: item.id });
        }
      }}
    >
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.gridThumbnail} />
        <View style={styles.heartOverlayPos}>
          <HeartButton videoId={item.id} size={16} />
        </View>

        <View style={styles.statsOverlay}>
          <View style={styles.statItem}>
            <Ionicons name="play" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.statText}>{formatNumber(item.views)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={11} color="#FF477E" style={{ marginRight: 3 }} />
            <Text style={styles.statText}>{formatNumber(item.likes)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <TouchableOpacity
          style={styles.creatorRow}
          activeOpacity={0.7}
          onPress={() => navigateTo({ name: 'creator_profile', userId: item.creator.id })}
        >
          <Image source={{ uri: item.creator.avatarUrl }} style={styles.creatorAvatar} />
          <Text
            style={[styles.creatorName, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.creator.displayName}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCreatorItem = ({ item }: { item: UserProfile }) => {
    const isFollowed = followedUserIds.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.creatorCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
        activeOpacity={0.85}
        onPress={() => navigateTo({ name: 'creator_profile', userId: item.id })}
      >
        <Image source={{ uri: item.avatarUrl }} style={styles.creatorCardAvatar} />
        <View style={styles.creatorCardInfo}>
          <Text style={[styles.creatorCardName, { color: theme.text }]}>
            {item.displayName}
          </Text>
          <Text style={[styles.creatorCardHandle, { color: theme.textMuted }]}>
            @{item.username} • {formatNumber(item.followers ?? item.followersCount)} người theo dõi
          </Text>
          <Text
            style={[styles.creatorCardBio, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.bio}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: isFollowed ? theme.surfaceVariant : theme.primary,
            },
          ]}
          onPress={() => toggleFollowUser(item.id)}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowed ? theme.text : '#FFFFFF' },
            ]}
          >
            {isFollowed ? 'Đang theo dõi' : '+ Theo dõi'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. Thanh tìm kiếm có Debounce 300ms */}
      <View style={[styles.searchBarWrapper, { backgroundColor: theme.surface }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.primary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm video, #hashtag, chủ đề hoặc tác giả..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gợi ý từ khóa nhanh */}
        <View style={styles.tagsFlex}>
          {suggestedTags.map((tag) => {
            const active = searchQuery.toLowerCase() === tag.toLowerCase();
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagPill,
                  {
                    backgroundColor: active ? theme.primary : theme.primaryLight,
                  },
                ]}
                onPress={() => setSearchQuery(active ? '' : tag)}
              >
                <Text
                  style={[
                    styles.tagPillText,
                    { color: active ? '#FFFFFF' : theme.primary },
                  ]}
                >
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Tabs phân loại */}
      <View
        style={[
          styles.tabsRow,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        {[
          { key: 'all', label: `Tất cả (${filteredVideos.length})` },
          { key: 'trending', label: '🔥 Thịnh hành' },
          { key: 'accounts', label: `👤 Tác giả (${filteredCreators.length})` },
          { key: 'liked', label: `❤️ Đã thích (${likedVideoIds.size})` },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabChip,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                },
              ]}
              onPress={() => setActiveTab(tab.key as SearchCategoryTab)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Kết quả hiển thị */}
      {activeTab === 'accounts' ? (
        <FlatList
          key="accounts-list"
          data={filteredCreators}
          keyExtractor={(item) => item.id}
          renderItem={renderCreatorItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="Không tìm thấy nhà sáng tạo"
              description="Hãy thử tìm kiếm bằng từ khóa khác."
            />
          }
        />
      ) : (
        <FlatList
          key="videos-grid"
          data={sortedVideos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoGridItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <EmptyState
              icon="video-off"
              title="Không tìm thấy video phù hợp"
              description="Thử xóa bộ lọc hoặc chọn một hashtag gợi ý ở phía trên."
              actionLabel="Xóa từ khóa"
              onAction={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBox: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  tagsFlex: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  gridItem: {
    width: '48.5%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 0.85,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  heartOverlayPos: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 10,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  creatorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  creatorCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  creatorCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  creatorCardName: {
    fontSize: 15,
    fontWeight: '800',
  },
  creatorCardHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  creatorCardBio: {
    fontSize: 12,
    marginTop: 4,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
