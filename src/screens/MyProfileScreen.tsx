import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VideoItem } from '../types';
import { StorageService } from '../services/storageService';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState } from '../components/EmptyState';
import { HeartButton } from '../components/HeartButton';
import { confirmDialog } from '../utils/dialog';
import { formatNumber } from '../utils/format';

type ProfileTab = 'videos' | 'liked' | 'saved';

export const MyProfileScreen: React.FC = () => {
  const {
    currentUser,
    isLoggedIn,
    signOut,
    videos,
    likedVideoIds,
    bookmarkedVideoIds,
    followedUserIds,
    unreadNotificationCount,
    deleteVideo,
    navigateTo,
    setTab,
  } = useApp();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileTab>('videos');
  const [draftCount, setDraftCount] = useState<number>(0);

  useEffect(() => {
    StorageService.getDrafts()
      .then((drafts) => setDraftCount(drafts.length))
      .catch(() => {});
  }, [videos.length]);

  // Nếu chưa đăng nhập -> Hiển thị màn hình mời Đăng nhập / Đăng ký (BT8.3)
  if (!isLoggedIn) {
    return (
      <View style={[styles.guestContainer, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.guestCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <LinearGradient
            colors={theme.primaryGradient}
            style={styles.guestIconCircle}
          >
            <Ionicons name="person" size={34} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.guestTitle, { color: theme.text }]}>
            Bạn chưa đăng nhập
          </Text>
          <Text style={[styles.guestSub, { color: theme.textSecondary }]}>
            Đăng nhập vào tài khoản VClip để quản lý kênh cá nhân, chỉnh sửa hồ sơ, xem thông báo và lưu trữ video yêu thích trên MongoDB.
          </Text>

          <View style={styles.guestBtnCol}>
            <PrimaryButton
              title="Đăng nhập ngay"
              onPress={() => navigateTo({ name: 'login' })}
            />
            <PrimaryButton
              title="Tạo tài khoản mới"
              variant="outline"
              onPress={() => navigateTo({ name: 'register' })}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Lọc video theo tab
  const myVideos = videos.filter((v) => v.creator.id === currentUser.id);
  const likedVideos = videos.filter((v) => likedVideoIds.has(v.id));
  const savedVideos = videos.filter((v) => bookmarkedVideoIds.has(v.id));

  const displayList =
    activeTab === 'videos'
      ? myVideos
      : activeTab === 'liked'
      ? likedVideos
      : savedVideos;

  const handleLogout = async () => {
    const ok = await confirmDialog(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?'
    );
    if (ok) {
      await signOut();
    }
  };

  const handleDeleteOwnVideo = async (video: VideoItem) => {
    const ok = await confirmDialog(
      'Xóa video đã đăng?',
      `Bạn có chắc chắn muốn xóa video "${video.title}" khỏi kênh của bạn không?`
    );
    if (ok) {
      await deleteVideo(video.id);
    }
  };

  const renderVideoGridItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={[styles.gridCard, { borderColor: theme.border }]}
      activeOpacity={0.85}
      onPress={() => navigateTo({ name: 'watch', videoId: item.id })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.gridImage} />
      <View style={styles.cardTopHeart}>
        <HeartButton videoId={item.id} size={14} />
      </View>
      {activeTab === 'videos' && item.creator.id === currentUser.id && (
        <TouchableOpacity
          style={styles.deleteCardBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            handleDeleteOwnVideo(item);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={13} color="#FCA5A5" />
        </TouchableOpacity>
      )}
      <View style={styles.viewsOverlay}>
        <Ionicons name="play" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
        <Text style={styles.viewsOverlayText}>{formatNumber(item.views)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={displayList}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoGridItem}
        numColumns={3}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View>
            {/* Card thông tin cá nhân */}
            <View
              style={[
                styles.profileCard,
                { backgroundColor: theme.surface, borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.topRow}>
                <LinearGradient
                  colors={theme.primaryGradient}
                  style={styles.avatarRing}
                >
                  <Image
                    source={{ uri: currentUser.avatarUrl }}
                    style={[styles.avatarImg, { borderColor: theme.surface }]}
                  />
                </LinearGradient>

                <View style={styles.userMainInfo}>
                  <Text style={[styles.displayName, { color: theme.text }]}>
                    {currentUser.displayName}
                  </Text>
                  <Text style={[styles.handleText, { color: theme.primary }]}>
                    @{currentUser.username}
                  </Text>
                  <View style={styles.metaLine}>
                    <Feather name="mail" size={12} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      {currentUser.email || 'demo@vclip.vn'}
                    </Text>
                  </View>
                  {currentUser.phone ? (
                    <View style={styles.metaLine}>
                      <Feather name="phone" size={12} color={theme.textMuted} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {currentUser.phone}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <Text style={[styles.bioText, { color: theme.textSecondary }]}>
                {currentUser.bio || 'Nhà sáng tạo nội dung trên nền tảng VClip ✨'}
              </Text>

              {/* Chỉ số thống kê */}
              <View
                style={[
                  styles.statsBox,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() =>
                    navigateTo({
                      name: 'follow_list',
                      userId: currentUser.id,
                      initialTab: 'following',
                    })
                  }
                >
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {followedUserIds.size}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Đang theo dõi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statCol}
                  onPress={() =>
                    navigateTo({
                      name: 'follow_list',
                      userId: currentUser.id,
                      initialTab: 'followers',
                    })
                  }
                >
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {formatNumber(currentUser.followers ?? currentUser.followersCount)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Người theo dõi
                  </Text>
                </TouchableOpacity>

                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {likedVideoIds.size}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                    Đã yêu thích
                  </Text>
                </View>
              </View>

              {/* Hàng nút chức năng: Chỉnh sửa hồ sơ (BT9.4), Thông báo (BT9.5), Đăng xuất (BT8.3) */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => navigateTo({ name: 'edit_profile' })}
                  activeOpacity={0.85}
                >
                  <Feather name="edit-2" size={14} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Chỉnh sửa hồ sơ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  ]}
                  onPress={() => navigateTo({ name: 'notifications' })}
                  activeOpacity={0.85}
                >
                  <Feather name="bell" size={14} color={theme.text} />
                  <Text style={[styles.secondaryActionText, { color: theme.text }]}>
                    Thông báo
                    {unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ''}
                  </Text>
                </TouchableOpacity>

                {draftCount > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryActionBtn,
                      {
                        backgroundColor: theme.primaryLight,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => navigateTo({ name: 'create_post' })}
                    activeOpacity={0.85}
                  >
                    <Feather name="folder" size={14} color={theme.primary} />
                    <Text style={[styles.secondaryActionText, { color: theme.primary }]}>
                      Bản nháp ({draftCount})
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.logoutBtn,
                    {
                      backgroundColor: theme.isDark
                        ? 'rgba(239, 68, 68, 0.16)'
                        : '#FEE2E2',
                      borderColor: theme.isDark
                        ? 'rgba(239, 68, 68, 0.35)'
                        : '#FECACA',
                    },
                  ]}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <Feather name="log-out" size={14} color={theme.danger} />
                  <Text style={[styles.logoutText, { color: theme.danger }]}>
                    Đăng xuất
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3 Tabs nội dung */}
            <View
              style={[
                styles.tabsBar,
                { backgroundColor: theme.surface, borderBottomColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'videos' && { borderBottomColor: theme.primary },
                ]}
                onPress={() => setActiveTab('videos')}
              >
                <Ionicons
                  name="videocam-outline"
                  size={16}
                  color={activeTab === 'videos' ? theme.primary : theme.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'videos' ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  Đã đăng ({myVideos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'liked' && { borderBottomColor: theme.primary },
                ]}
                onPress={() => setActiveTab('liked')}
              >
                <Ionicons
                  name="heart-outline"
                  size={16}
                  color={activeTab === 'liked' ? theme.primary : theme.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'liked' ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  Đã thích ({likedVideos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'saved' && { borderBottomColor: theme.primary },
                ]}
                onPress={() => setActiveTab('saved')}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={16}
                  color={activeTab === 'saved' ? theme.primary : theme.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: activeTab === 'saved' ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  Đã lưu ({savedVideos.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === 'videos' ? 'video' : activeTab === 'liked' ? 'heart' : 'bookmark'}
            title={
              activeTab === 'videos'
                ? 'Bạn chưa đăng tải video nào'
                : activeTab === 'liked'
                ? 'Chưa có video yêu thích'
                : 'Chưa có video đã lưu'
            }
            description={
              activeTab === 'videos'
                ? 'Hãy nhấn nút Đăng tải để chia sẻ video đầu tiên của bạn lên hệ thống MongoDB!'
                : 'Hãy thả tim hoặc lưu lại các video thú vị khi xem nhé.'
            }
            actionLabel={activeTab === 'videos' ? '+ Đăng video mới' : 'Khám phá ngay'}
            onAction={() => setTab(activeTab === 'videos' ? 'create' : 'home')}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  guestCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  guestIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  guestSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  guestBtnCol: {
    width: '100%',
  },
  listContainer: {
    paddingBottom: 40,
  },
  profileCard: {
    padding: 18,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    padding: 3,
    marginRight: 14,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    borderWidth: 2,
  },
  userMainInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 19,
    fontWeight: '900',
  },
  handleText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
    marginBottom: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  statsBox: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  actionBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  columnWrapper: {
    gap: 2,
    marginBottom: 2,
  },
  gridCard: {
    flex: 1 / 3,
    maxWidth: '32.8%',
    aspectRatio: 0.78,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  cardTopHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
  },
  deleteCardBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
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
  viewsOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
