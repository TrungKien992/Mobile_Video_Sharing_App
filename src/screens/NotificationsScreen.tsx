import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../components/NotificationItem';
import { EmptyState } from '../components/EmptyState';
import { AppNotification } from '../types';

export const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    navigateTo,
    goBack,
    refreshVideos,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'interact' | 'follow'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'interact') return n.type === 'like' || n.type === 'comment';
    if (filterType === 'follow') return n.type === 'follow';
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshVideos();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePressNotification = async (item: AppNotification) => {
    if (!item.read) {
      await markNotificationRead(item.id);
    }
    if (item.target) {
      if (item.target.screen === 'creator_profile' && item.target.creatorId) {
        navigateTo({ name: 'creator_profile', userId: item.target.creatorId });
        return;
      }
      if (item.target.screen === 'watch' && item.target.videoId) {
        navigateTo({ name: 'watch', videoId: item.target.videoId });
        return;
      }
    }
    if (item.targetId) {
      if (item.type === 'follow') {
        navigateTo({ name: 'creator_profile', userId: item.targetId });
      } else {
        navigateTo({ name: 'watch', videoId: item.targetId });
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.titleCenter}>
          <Text style={[styles.topTitle, { color: theme.text }]}>
            Thông báo ({unreadNotificationCount} chưa đọc)
          </Text>
        </View>
        {unreadNotificationCount > 0 ? (
          <TouchableOpacity onPress={markAllNotificationsRead} style={styles.readAllBtn}>
            <Text style={[styles.readAllText, { color: theme.primary }]}>
              Đọc tất cả
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Bộ lọc nhanh loại thông báo */}
      <View
        style={[
          styles.filterBar,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: `Tất cả (${notifications.length})` },
            { key: 'unread', label: `Chưa đọc (${unreadNotificationCount})` },
            { key: 'interact', label: '❤️ Thích & Bình luận' },
            { key: 'follow', label: '👤 Người theo dõi' },
          ].map((item) => {
            const active = filterType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceVariant,
                  },
                ]}
                onPress={() => setFilterType(item.key as any)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={() => handlePressNotification(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title="Chưa có thông báo nào"
            description="Khi có người thích, bình luận hoặc theo dõi bạn, thông báo sẽ xuất hiện tại đây."
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
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  readAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    borderBottomWidth: 1,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
