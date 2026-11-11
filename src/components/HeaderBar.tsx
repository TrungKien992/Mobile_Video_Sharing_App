import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

interface HeaderBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = 'VClip',
  showBack = false,
  onBack,
  rightActions,
}) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const {
    unreadNotificationCount,
    navigateTo,
    isLoggedIn,
    currentUser,
    currentTab,
    setTab,
  } = useApp();

  return (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
            <Text style={[styles.headerPageTitle, { color: theme.text }]}>{title}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.logoRow}>
            <LinearGradient
              colors={theme.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.brandTitle, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.brandSub, { color: theme.textMuted }]}>
                Video ngắn sáng tạo
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightActions ? (
          rightActions
        ) : (
          <View style={styles.defaultRightRow}>
            {/* Nút Tìm kiếm nhanh (Ẩn khi đang đứng ở tab Tìm kiếm) */}
            {currentTab !== 'search' && (
              <TouchableOpacity
                onPress={() => setTab('search')}
                style={[styles.iconBtn, { backgroundColor: theme.surfaceVariant }]}
                activeOpacity={0.7}
              >
                <Feather name="search" size={18} color={theme.text} />
              </TouchableOpacity>
            )}

            {/* Đổi giao diện Sáng / Tối */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.iconBtn, { backgroundColor: theme.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={19}
                color={theme.text}
              />
            </TouchableOpacity>

            {/* Chuông thông báo có số lượng chưa đọc (BT9.5) */}
            <TouchableOpacity
              onPress={() => navigateTo({ name: 'notifications' })}
              style={[styles.iconBtn, { backgroundColor: theme.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={19} color={theme.text} />
              {unreadNotificationCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Avatar hoặc nút Đăng nhập */}
            {isLoggedIn ? (
              <TouchableOpacity
                onPress={() => setTab('profile')}
                activeOpacity={0.8}
                style={styles.avatarWrap}
              >
                <Image
                  source={{ uri: currentUser.avatarUrl }}
                  style={[styles.headerAvatar, { borderColor: theme.primary }]}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => navigateTo({ name: 'login' })}
                style={[styles.loginChip, { backgroundColor: theme.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.loginChipText}>Đăng nhập</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPageTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarWrap: {
    marginLeft: 2,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },
  loginChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  loginChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
