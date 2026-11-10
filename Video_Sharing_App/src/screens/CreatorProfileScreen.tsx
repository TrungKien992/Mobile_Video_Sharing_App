import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types';
import { HeartButton } from '../components/HeartButton';
import { formatNumber } from '../utils/format';
import { showMessage } from '../utils/dialog';

export const CreatorProfileScreen: React.FC<{ userId: string }> = ({ userId }) => {
  const {
    videos,
    creators,
    followedUserIds,
    toggleFollowUser,
    goBack,
    navigateTo,
  } = useApp();
  const { theme } = useTheme();

  const creator = creators.find((c) => c.id === userId) || creators[0];
  const isFollowed = followedUserIds.has(creator.id);

  const [activeTab, setActiveTab] = useState<'videos' | 'liked'>('videos');

  const creatorVideos = videos.filter((v) => v.creator.id === creator.id);
  const displayVideos =
    activeTab === 'videos'
      ? creatorVideos.length > 0
        ? creatorVideos
        : videos.slice(0, 4)
      : videos.slice(0, 3);

  const renderVideoGridItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.85}
      onPress={() => navigateTo({ name: 'watch', videoId: item.id })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.gridImage} />
      <View style={styles.heartPos}>
        <HeartButton videoId={item.id} size={14} />
      </View>
      <View style={styles.viewsOverlay}>
        <Ionicons name="play" size={11} color="#FFFFFF" style={{ marginRight: 2 }} />
        <Text style={styles.viewsText}>{formatNumber(item.views)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.topHeader,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          @{creator.username}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={displayVideos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoGridItem}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={[styles.profileHeader, { backgroundColor: theme.surface }]}>
            <View style={[styles.avatarCircle, { borderColor: theme.primary }]}>
              <Image source={{ uri: creator.avatarUrl }} style={styles.avatarImg} />
            </View>

            <Text style={[styles.displayName, { color: theme.text }]}>
              {creator.displayName}
            </Text>
            <Text style={[styles.bioText, { color: theme.textSecondary }]}>
              {creator.bio || 'Nhà sáng tạo nội dung video ngắn trên VClip ❤️'}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: theme.text }]}>
                  {formatNumber(creator.following ?? creator.followingCount)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Đang theo dõi
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: theme.text }]}>
                  {formatNumber(creator.followers ?? creator.followersCount)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Người theo dõi
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: theme.text }]}>
                  {formatNumber(creator.likes ?? creator.likesCount)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Lượt thích
                </Text>
              </View>
            </View>

            {/* Nút Follow (lưu vào MongoDB, không reset khi F5) & Nhắn tin */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: isFollowed
                      ? theme.surfaceVariant
                      : theme.primary,
                  },
                ]}
                onPress={() => toggleFollowUser(creator.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    { color: isFollowed ? theme.text : '#FFFFFF' },
                  ]}
                >
                  {isFollowed ? '✓ Đang theo dõi' : '+ Theo dõi kênh'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.messageBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() =>
                  showMessage(
                    'Trò chuyện',
                    `Đã mở hộp thoại tin nhắn với ${creator.displayName}`
                  )
                }
                activeOpacity={0.8}
              >
                <Text style={[styles.messageBtnText, { color: theme.text }]}>
                  Nhắn tin
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabsBar, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'videos' && { borderBottomColor: theme.primary },
                ]}
                onPress={() => setActiveTab('videos')}
              >
                <Ionicons
                  name="videocam-outline"
                  size={16}
                  color={activeTab === 'videos' ? theme.primary : theme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === 'videos' ? theme.primary : theme.textMuted },
                  ]}
                >
                  Video ({displayVideos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  activeTab === 'liked' && { borderBottomColor: theme.primary },
                ]}
                onPress={() => setActiveTab('liked')}
              >
                <Ionicons
                  name="heart-outline"
                  size={16}
                  color={activeTab === 'liked' ? theme.primary : theme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeTab === 'liked' ? theme.primary : theme.textMuted },
                  ]}
                >
                  Nổi bật
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 18,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    borderWidth: 2.5,
    marginBottom: 10,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  displayName: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 8,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  followBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  messageBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabsBar: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  columnWrapper: {
    gap: 2,
    marginBottom: 2,
  },
  gridCard: {
    flex: 1 / 3,
    aspectRatio: 0.78,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  heartPos: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
  },
  viewsOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
