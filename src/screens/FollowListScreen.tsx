import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfile } from '../types';
import { EmptyState } from '../components/EmptyState';
import { formatNumber } from '../utils/format';

interface FollowListScreenProps {
  userId: string;
  initialTab?: 'followers' | 'following';
  isTabMode?: boolean;
}

export const FollowListScreen: React.FC<FollowListScreenProps> = ({
  userId,
  initialTab = 'following',
  isTabMode = false,
}) => {
  const {
    currentUser,
    creators,
    followedUserIds,
    toggleFollowUser,
    goBack,
    navigateTo,
  } = useApp();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [filterQuery, setFilterQuery] = useState('');

  const targetUser =
    userId === currentUser.id
      ? currentUser
      : creators.find((c) => c.id === userId) || currentUser;

  const otherUsers = creators.filter((c) => c.id !== targetUser.id);

  const followingList =
    targetUser.id === currentUser.id
      ? otherUsers.filter((c) => followedUserIds.has(c.id))
      : otherUsers.filter((c) => (targetUser.followingIds || []).includes(c.id));

  const followersList = otherUsers.filter((c) => {
    if (Array.isArray(targetUser.followerIds) && targetUser.followerIds.includes(c.id)) {
      return true;
    }
    if (c.id === currentUser.id && targetUser.id !== currentUser.id) {
      return followedUserIds.has(targetUser.id);
    }
    if (Array.isArray(c.followingIds) && c.followingIds.includes(targetUser.id)) {
      return true;
    }
    return false;
  });

  const currentDisplayList = (
    activeTab === 'following' ? followingList : followersList
  ).filter(
    (u) =>
      u.displayName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const suggestions = otherUsers.filter((c) => !followedUserIds.has(c.id));

  const renderUserItem = ({ item }: { item: UserProfile }) => {
    const isFollowing = followedUserIds.has(item.id);

    return (
      <View
        style={[
          styles.userRow,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.userInfoLeft}
          onPress={() => navigateTo({ name: 'creator_profile', userId: item.id })}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.avatarUrl }} style={styles.userAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.userDisplayName, { color: theme.text }]}>
              {item.displayName}
            </Text>
            <Text style={[styles.userHandle, { color: theme.textMuted }]}>
              @{item.username} •{' '}
              {formatNumber(
                Array.isArray(item.followerIds)
                  ? item.followerIds.length
                  : (item.followersCount ?? 0)
              )}{' '}
              người theo dõi
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.followActionBtn,
            {
              backgroundColor: isFollowing ? theme.surfaceVariant : theme.primary,
            },
          ]}
          onPress={() => toggleFollowUser(item.id)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.followActionText,
              { color: isFollowing ? theme.text : '#FFFFFF' },
            ]}
          >
            {isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 1. Header (Chỉ hiển thị nút Back khi mở dạng màn hình con) */}
      {!isTabMode && (
        <View
          style={[
            styles.header,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleRow}>
            <Image source={{ uri: targetUser.avatarUrl }} style={styles.headerAvatar} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              @{targetUser.username || targetUser.displayName}
            </Text>
          </View>

          <View style={{ width: 32 }} />
        </View>
      )}

      {/* Thanh tìm kiếm bạn bè */}
      <View style={[styles.searchWrap, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchRow, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons
            name="search"
            size={16}
            color={theme.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Tìm nhà sáng tạo theo tên hoặc @username..."
            placeholderTextColor={theme.textMuted}
            value={filterQuery}
            onChangeText={setFilterQuery}
          />
          {filterQuery.length > 0 && (
            <TouchableOpacity onPress={() => setFilterQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Tabs chuyển đổi */}
      <View
        style={[
          styles.tabsRow,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'following' && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setActiveTab('following')}
        >
          <Text
            style={[
              styles.tabTitle,
              {
                color: activeTab === 'following' ? theme.primary : theme.textMuted,
              },
            ]}
          >
            Đang theo dõi ({followingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'followers' && { borderBottomColor: theme.primary },
          ]}
          onPress={() => setActiveTab('followers')}
        >
          <Text
            style={[
              styles.tabTitle,
              {
                color: activeTab === 'followers' ? theme.primary : theme.textMuted,
              },
            ]}
          >
            Người theo dõi ({followersList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Danh sách người dùng */}
      <FlatList
        data={currentDisplayList}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="user-plus"
            title="Chưa theo dõi nhà sáng tạo nào"
            description="Hãy nhấn nút Theo dõi ở danh sách Gợi ý bên dưới nhé!"
          />
        }
        ListFooterComponent={
          suggestions.length > 0 ? (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsHeader, { color: theme.text }]}>
                🌟 Gợi ý nhà sáng tạo nổi bật
              </Text>
              {suggestions.map((sug) => (
                <View key={sug.id}>{renderUserItem({ item: sug })}</View>
              ))}
            </View>
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  userDisplayName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
  },
  followActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  followActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
});
