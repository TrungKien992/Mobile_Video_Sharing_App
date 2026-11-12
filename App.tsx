import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';
import { PopupProvider } from './src/components/PopupProvider';
import { HeaderBar } from './src/components/HeaderBar';
import { BottomTabBar } from './src/components/BottomTabBar';
import { LoadingView } from './src/components/LoadingView';
import { usePersistence } from './src/hooks/usePersistence';

import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { VideoWatchingScreen } from './src/screens/VideoWatchingScreen';
import { LiveStreamScreen } from './src/screens/LiveStreamScreen';
import { CreateVideoScreen } from './src/screens/CreateVideoScreen';
import { PostVideoScreen } from './src/screens/PostVideoScreen';
import { MyProfileScreen } from './src/screens/MyProfileScreen';
import { CreatorProfileScreen } from './src/screens/CreatorProfileScreen';
import { FollowListScreen } from './src/screens/FollowListScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';

const MainNavigator: React.FC = () => {
  const { activeRoute, currentTab, currentUser, setTab } = useApp();
  const { isDarkMode, theme } = useTheme();
  const ready = usePersistence();
  const insets = useSafeAreaInsets();

  if (!ready) {
    return <LoadingView message="Đang tải..." />;
  }

  const renderActiveScreen = () => {
    switch (activeRoute.name) {
      case 'watch':
        return <VideoWatchingScreen videoId={activeRoute.videoId} />;
      case 'live':
        return <LiveStreamScreen videoId={activeRoute.videoId} />;
      case 'create_post':
        return (
          <PostVideoScreen
            draftVideoUri={activeRoute.draftVideoUri}
            selectedFilterId={activeRoute.selectedFilterId}
            selectedMusicId={activeRoute.selectedMusicId}
          />
        );
      case 'creator_profile':
        return <CreatorProfileScreen userId={activeRoute.userId} />;
      case 'follow_list':
        return (
          <FollowListScreen
            userId={activeRoute.userId}
            initialTab={activeRoute.initialTab}
            isTabMode={false}
          />
        );
      case 'login':
        return <LoginScreen />;
      case 'register':
        return <RegisterScreen />;
      case 'edit_profile':
        return <EditProfileScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'main':
      default:
        switch (currentTab) {
          case 'home':
            return <HomeScreen />;
          case 'search':
            return <SearchScreen />;
          case 'create':
            return <CreateVideoScreen />;
          case 'friends':
            return (
              <FollowListScreen
                userId={currentUser.id}
                initialTab="following"
                isTabMode={true}
              />
            );
          case 'profile':
            return <MyProfileScreen />;
          default:
            return <HomeScreen />;
        }
    }
  };

  const isFullscreenView =
    activeRoute.name === 'watch' ||
    activeRoute.name === 'live' ||
    (activeRoute.name === 'main' && currentTab === 'create');

  const showTopHeader =
    activeRoute.name === 'main' &&
    (currentTab === 'home' ||
      currentTab === 'search' ||
      currentTab === 'friends' ||
      currentTab === 'profile');

  const showBottomTabBar =
    activeRoute.name === 'main' && currentTab !== 'create';

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: isFullscreenView ? '#000000' : theme.background,
          paddingTop: isFullscreenView ? 0 : insets.top,
          paddingBottom: isFullscreenView || showBottomTabBar ? 0 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={isFullscreenView || isDarkMode ? 'light' : 'dark'} />
      <ResponsiveContainer>
        <PopupProvider>
          <View style={[styles.appWrapper, { backgroundColor: theme.background }]}>
            {showTopHeader && <HeaderBar />}
            <View style={styles.screenContent}>{renderActiveScreen()}</View>
            {showBottomTabBar && (
              <BottomTabBar currentTab={currentTab} onSelectTab={setTab} />
            )}
          </View>
        </PopupProvider>
      </ResponsiveContainer>
    </View>
  );
};

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'VClip';
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <MainNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screenContent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
