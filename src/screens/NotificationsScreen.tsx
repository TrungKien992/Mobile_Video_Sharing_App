import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
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
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
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

      <FlatList
        data={notifications}
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
