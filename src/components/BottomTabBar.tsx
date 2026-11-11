import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MainTabType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BottomTabBarProps {
  currentTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onSelectTab }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: theme.surface, borderTopColor: theme.border },
      ]}
    >
      {/* Tab 1: Khám phá */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('home')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={currentTab === 'home' ? 'compass' : 'compass-outline'}
          size={23}
          color={currentTab === 'home' ? theme.primary : theme.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: currentTab === 'home' ? theme.primary : theme.textMuted },
          ]}
        >
          Khám phá
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Tìm kiếm */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('search')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={currentTab === 'search' ? 'search' : 'search-outline'}
          size={23}
          color={currentTab === 'search' ? theme.primary : theme.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: currentTab === 'search' ? theme.primary : theme.textMuted },
          ]}
        >
          Tìm kiếm
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Đăng video (+) */}
      <TouchableOpacity
        style={styles.createButtonWrapper}
        onPress={() => onSelectTab('create')}
        activeOpacity={0.85}
      >
        <View style={[styles.createOuterCircle, { backgroundColor: theme.surface }]}>
          <LinearGradient
            colors={theme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <Ionicons name="videocam" size={24} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={[styles.createLabel, { color: theme.primary }]}>Đăng tải</Text>
      </TouchableOpacity>

      {/* Tab 4: Cộng đồng / Bạn bè */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('friends')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={currentTab === 'friends' ? 'people' : 'people-outline'}
          size={23}
          color={currentTab === 'friends' ? theme.primary : theme.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: currentTab === 'friends' ? theme.primary : theme.textMuted },
          ]}
        >
          Cộng đồng
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Cá nhân */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onSelectTab('profile')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={currentTab === 'profile' ? 'person' : 'person-outline'}
          size={23}
          color={currentTab === 'profile' ? theme.primary : theme.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: currentTab === 'profile' ? theme.primary : theme.textMuted },
          ]}
        >
          Cá nhân
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    height: Platform.OS === 'ios' ? 76 : 66,
    paddingBottom: Platform.OS === 'ios' ? 14 : 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    zIndex: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  createButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  createOuterCircle: {
    padding: 4,
    borderRadius: 28,
    shadowColor: '#5B4BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
});
