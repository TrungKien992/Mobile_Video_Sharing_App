import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppNotification,
  CommentItem,
  MainTabType,
  ScreenRoute,
  UserProfile,
  VideoItem,
} from '../types';
import { StorageService } from '../services/storageService';
import { VideoCacheService } from '../services/videoCacheService';
import { CURRENT_USER, INITIAL_CREATORS } from '../data/initialCreators';
import { loadAuth, saveAuth, clearAuth } from '../storage/authStorage';
import { useAutoPersist } from '../hooks/useAutoPersist';
import * as notificationService from '../services/notificationService';
import * as commentService from '../services/commentService';
import { setApiAuthToken } from '../api/client';
import { showToast } from '../utils/dialog';

export interface AppContextType {
  videos: VideoItem[];
  creators: UserProfile[];
  activeRoute: ScreenRoute;
  currentTab: MainTabType;
  currentUser: UserProfile;
  token: string | null;
  isLoggedIn: boolean;
  likedVideoIds: Set<string>;
  bookmarkedVideoIds: Set<string>;
  followedUserIds: Set<string>;
  savedFilterIds: Set<string>;
  savedMusicIds: Set<string>;
  searchPresetQuery: string;
  createPresetMusicId: string | null;
  comments: CommentItem[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isLoading: boolean;
  ready: boolean;
  selectedVideoForWatch: VideoItem | null;
  signIn: (user: UserProfile, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  patchUser: (partial: Partial<UserProfile>) => Promise<void>;
  toggleLikeVideo: (videoId: string) => Promise<void>;
  toggleBookmarkVideo: (videoId: string) => Promise<void>;
  toggleFollowUser: (userId: string) => Promise<void>;
  toggleSaveFilter: (filterId: string) => void;
  toggleSaveMusic: (musicId: string) => void;
  incrementVideoView: (videoId: string) => Promise<void>;
  openSearchWithQuery: (query: string) => void;
  clearSearchPresetQuery: () => void;
  openCreateWithMusic: (musicId: string) => void;
  clearCreatePresetMusic: () => void;
  addComment: (videoId: string, text: string, rating?: number) => Promise<CommentItem>;
  toggleLikeComment: (commentId: string) => Promise<void>;
  addNewVideo: (videoData: Partial<VideoItem>) => Promise<VideoItem>;
  deleteVideo: (videoId: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  navigateTo: (route: ScreenRoute) => void;
  setTab: (tab: MainTabType) => void;
  goBack: () => void;
  refreshVideos: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [creators, setCreators] = useState<UserProfile[]>(INITIAL_CREATORS);
  const [activeRoute, setActiveRoute] = useState<ScreenRoute>({ name: 'main', tab: 'home' });
  const [routeHistory, setRouteHistory] = useState<ScreenRoute[]>([]);
  const [currentTab, setCurrentTab] = useState<MainTabType>('home');
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [token, setToken] = useState<string | null>('tk_me');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [bookmarkedVideoIds, setBookmarkedVideoIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [savedFilterIds, setSavedFilterIds] = useState<Set<string>>(new Set(['film', 'spring']));
  const [savedMusicIds, setSavedMusicIds] = useState<Set<string>>(new Set(['m1', 'm3']));
  const [searchPresetQuery, setSearchPresetQuery] = useState<string>('');
  const [createPresetMusicId, setCreatePresetMusicId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    setApiAuthToken(token);
  }, [token]);

  // Nạp dữ liệu khởi động từ MongoDB Backend + AsyncStorage (Hydration)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const storedAuth = await loadAuth();
        let activeUser = CURRENT_USER;

        if (storedAuth && storedAuth.user) {
          activeUser = storedAuth.user;
          setCurrentUser(storedAuth.user);
          setToken(storedAuth.token);
          setIsLoggedIn(true);
        } else {
          const savedUser = await StorageService.getCurrentUser();
          activeUser = savedUser;
          setCurrentUser(savedUser);
          setToken('tk_' + savedUser.id);
          setIsLoggedIn(true);
          await saveAuth({ user: savedUser, token: 'tk_' + savedUser.id });
        }

        const [
          loadedVideos,
          storedLikedIds,
          storedBookmarkedIds,
          storedFollowedIds,
          allComments,
          allCreators,
          userNotifs,
        ] = await Promise.all([
          StorageService.getVideos(activeUser.id),
          StorageService.getLikedVideoIds(),
          StorageService.getBookmarkedVideoIds(),
          StorageService.getFollowedUserIds(),
          StorageService.getComments(),
          StorageService.getCreators(activeUser.id),
          notificationService.fetchNotifications(activeUser.id),
        ]);

        // Đồng bộ ưu tiên dữ liệu thực từ MongoDB nếu có, kết hợp với AsyncStorage
        const dbLikedIds = loadedVideos.filter((v) => v.isLiked).map((v) => v.id);
        const dbBookmarkedIds = loadedVideos.filter((v) => v.isBookmarked).map((v) => v.id);
        const activeUserFromDb = allCreators.find((c) => c.id === activeUser.id);
        if (activeUserFromDb) {
          setCurrentUser((prev) => ({ ...prev, ...activeUserFromDb }));
        }

        const likedSet = new Set<string>(
          dbLikedIds.length > 0 ? dbLikedIds : storedLikedIds
        );
        const bookmarkedSet = new Set<string>(
          dbBookmarkedIds.length > 0 ? dbBookmarkedIds : storedBookmarkedIds
        );
        const followedSet = new Set<string>(
          activeUserFromDb?.followingIds && activeUserFromDb.followingIds.length > 0
            ? activeUserFromDb.followingIds
            : storedFollowedIds
        );

        const syncedVideos = loadedVideos.map((v: VideoItem) => ({
          ...v,
          isLiked: likedSet.has(v.id),
          isBookmarked: bookmarkedSet.has(v.id),
        }));

        const syncedCreators = allCreators.map((c: UserProfile) => ({
          ...c,
          isFollowing: followedSet.has(c.id),
          isFollowed: followedSet.has(c.id),
        }));

        setVideos(syncedVideos);
        VideoCacheService.populateMemoryCache(syncedVideos);
        setLikedVideoIds(likedSet);
        setBookmarkedVideoIds(bookmarkedSet);
        setFollowedUserIds(followedSet);
        setComments(allComments);
        setCreators(syncedCreators);
        setNotifications(userNotifs);

        try {
          const [rawSavedFilters, rawSavedMusics] = await Promise.all([
            AsyncStorage.getItem('@vclip_saved_filters_v2'),
            AsyncStorage.getItem('@vclip_saved_musics_v2'),
          ]);
          if (rawSavedFilters) {
            setSavedFilterIds(new Set(JSON.parse(rawSavedFilters)));
          }
          if (rawSavedMusics) {
            setSavedMusicIds(new Set(JSON.parse(rawSavedMusics)));
          }
        } catch {}
      } catch (err) {
        console.error('Lỗi nạp dữ liệu khởi động:', err);
      } finally {
        setIsLoading(false);
        setReady(true);
      }
    };

    loadInitialData();
  }, []);

  // Tự động lưu xuống AsyncStorage mỗi khi state thay đổi (chỉ sau khi ready = true để tránh ghi đè khi F5)
  useAutoPersist('@vclip_liked_videos_v2', Array.from(likedVideoIds), ready);
  useAutoPersist('@vclip_bookmarked_videos_v2', Array.from(bookmarkedVideoIds), ready);
  useAutoPersist('@vclip_followed_users_v2', Array.from(followedUserIds), ready);
  useAutoPersist('@vclip_saved_filters_v2', Array.from(savedFilterIds), ready);
  useAutoPersist('@vclip_saved_musics_v2', Array.from(savedMusicIds), ready);
  useAutoPersist('@vclip_videos_v2', videos, ready);
  useAutoPersist('@vclip_comments_v2', comments, ready);
  useAutoPersist('@vclip_notifications_v2', notifications, ready);

  const navigateTo = useCallback(
    (route: ScreenRoute) => {
      setRouteHistory((prev) => [...prev, activeRoute]);
      setActiveRoute(route);
      if (route.name === 'main' && route.tab) {
        setCurrentTab(route.tab);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.pushState) {
        try {
          window.history.pushState({ route }, '');
        } catch {}
      }
    },
    [activeRoute]
  );

  const goBack = useCallback(() => {
    if (routeHistory.length > 0) {
      const prev = routeHistory[routeHistory.length - 1];
      setRouteHistory((h) => h.slice(0, h.length - 1));
      setActiveRoute(prev);
      if (prev.name === 'main' && prev.tab) {
        setCurrentTab(prev.tab);
      }
      return true;
    } else if (activeRoute.name !== 'main' || currentTab !== 'home') {
      setActiveRoute({ name: 'main', tab: 'home' });
      setCurrentTab('home');
      return true;
    }
    return false;
  }, [routeHistory, activeRoute, currentTab]);

  // Hỗ trợ nút Back cứng trên Android & nút Back trình duyệt trên Web
  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        return goBack();
      });
      return () => sub.remove();
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onPopState = () => {
        goBack();
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [goBack]);

  const setTab = (tab: MainTabType) => {
    if (activeRoute.name !== 'main') {
      setRouteHistory((prev) => [...prev, activeRoute]);
    }
    setCurrentTab(tab);
    setActiveRoute({ name: 'main', tab });
  };

  const openSearchWithQuery = (query: string) => {
    setSearchPresetQuery(query.replace(/^#/, '').trim());
    setCurrentTab('search');
    setActiveRoute({ name: 'main', tab: 'search' });
  };

  const clearSearchPresetQuery = () => {
    setSearchPresetQuery('');
  };

  const openCreateWithMusic = (musicId: string) => {
    setCreatePresetMusicId(musicId);
    setCurrentTab('create');
    setActiveRoute({ name: 'main', tab: 'create' });
  };

  const clearCreatePresetMusic = () => {
    setCreatePresetMusicId(null);
  };

  const toggleSaveFilter = (filterId: string) => {
    setSavedFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
        showToast('Đã bỏ lưu bộ lọc', 'info');
      } else {
        next.add(filterId);
        showToast('Đã lưu bộ lọc vào mục yêu thích ✨', 'bookmark');
      }
      return next;
    });
  };

  const toggleSaveMusic = (musicId: string) => {
    setSavedMusicIds((prev) => {
      const next = new Set(prev);
      if (next.has(musicId)) {
        next.delete(musicId);
        showToast('Đã bỏ lưu âm thanh', 'info');
      } else {
        next.add(musicId);
        showToast('Đã lưu âm thanh vào mục yêu thích 🎵', 'bookmark');
      }
      return next;
    });
  };

  const incrementVideoView = useCallback(async (videoId: string) => {
    const newViews = await StorageService.incrementVideoView(videoId);
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? { ...v, views: newViews !== undefined ? newViews : (v.views || 0) + 1 }
          : v
      )
    );
  }, []);

  const signIn = async (user: UserProfile, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    setIsLoggedIn(true);
    await saveAuth({ user, token: authToken });
    await StorageService.updateCurrentUser(user);

    const [userVids, notifs] = await Promise.all([
      StorageService.getVideos(user.id),
      notificationService.fetchNotifications(user.id),
    ]);

    const dbLiked = userVids.filter((v) => v.isLiked).map((v) => v.id);
    const dbBookmarked = userVids.filter((v) => v.isBookmarked).map((v) => v.id);
    setVideos(userVids);
    setLikedVideoIds(new Set<string>(dbLiked));
    setBookmarkedVideoIds(new Set<string>(dbBookmarked));
    if (user.followingIds) {
      setFollowedUserIds(new Set<string>(user.followingIds));
    }
    setNotifications(notifs);
    showToast(`Xin chào ${user.displayName}! 👋`, 'success');
  };

  const signOut = async () => {
    setToken(null);
    setIsLoggedIn(false);
    await clearAuth();
    showToast('Đã đăng xuất khỏi tài khoản', 'info');
  };

  const patchUser = async (partial: Partial<UserProfile>) => {
    const updated = await StorageService.updateCurrentUser({
      ...currentUser,
      ...partial,
      id: currentUser.id,
    });
    setCurrentUser(updated);
    if (token) {
      await saveAuth({ user: updated, token });
    }
    setVideos((prev) =>
      prev.map((v) => (v.creator.id === updated.id ? { ...v, creator: updated } : v))
    );
    setCreators((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

  const updateProfile = async (profile: Partial<UserProfile>) => {
    await patchUser(profile);
  };

  const toggleLikeVideo = async (videoId: string) => {
    const { isLiked, allLikedIds, likesCount } = await StorageService.toggleLikeVideo(
      videoId,
      currentUser.id
    );
    setLikedVideoIds(new Set<string>(allLikedIds));

    setVideos((prevVideos) =>
      prevVideos.map((v) => {
        if (v.id === videoId) {
          const delta = isLiked ? 1 : -1;
          const updated: VideoItem = {
            ...v,
            likes: likesCount !== undefined ? likesCount : Math.max(0, v.likes + delta),
            isLiked,
          };
          VideoCacheService.setVideoToMemory(updated);
          return updated;
        }
        return v;
      })
    );

    showToast(
      isLiked ? 'Đã thêm vào Video yêu thích ❤️' : 'Đã bỏ thích video',
      isLiked ? 'heart' : 'info'
    );
  };

  const toggleBookmarkVideo = async (videoId: string) => {
    const { isBookmarked, allBookmarkedIds } = await StorageService.toggleBookmarkVideo(
      videoId,
      currentUser.id
    );
    setBookmarkedVideoIds(new Set<string>(allBookmarkedIds));

    setVideos((prevVideos) =>
      prevVideos.map((v) => (v.id === videoId ? { ...v, isBookmarked } : v))
    );

    showToast(
      isBookmarked ? 'Đã lưu video vào bộ sưu tập 🔖' : 'Đã bỏ lưu video',
      isBookmarked ? 'bookmark' : 'info'
    );
  };

  const toggleFollowUser = async (targetUserId: string) => {
    const targetCreator = creators.find((c) => c.id === targetUserId);
    const { isFollowed, allFollowedIds } = await StorageService.toggleFollowUser(
      targetUserId,
      currentUser.id
    );
    setFollowedUserIds(new Set<string>(allFollowedIds));

    const delta = isFollowed ? 1 : -1;
    setCreators((prev) =>
      prev.map((c) =>
        c.id === targetUserId
          ? {
              ...c,
              isFollowing: isFollowed,
              isFollowed,
              followersCount: Math.max(0, (c.followersCount || 0) + delta),
              followers: Math.max(0, (c.followers || c.followersCount || 0) + delta),
            }
          : c
      )
    );
    setCurrentUser((prev) => ({
      ...prev,
      followingCount: allFollowedIds.length,
      following: allFollowedIds.length,
    }));

    showToast(
      isFollowed
        ? `Đã theo dõi ${targetCreator?.displayName || 'nhà sáng tạo'} ✨`
        : `Đã hủy theo dõi ${targetCreator?.displayName || 'nhà sáng tạo'}`,
      isFollowed ? 'success' : 'info'
    );
  };

  const addComment = async (
    videoId: string,
    text: string,
    rating: number = 5
  ): Promise<CommentItem> => {
    const newComment = await StorageService.addComment(videoId, text, currentUser, rating);
    setComments((prev) => [newComment, ...prev]);

    setVideos((prevVideos) =>
      prevVideos.map((v) => {
        if (v.id === videoId) {
          return { ...v, commentsCount: v.commentsCount + 1 };
        }
        return v;
      })
    );
    showToast(`Đã gửi bình luận & đánh giá ${rating} sao ★`, 'success');
    return newComment;
  };

  const toggleLikeComment = async (commentId: string) => {
    try {
      const res = await commentService.toggleLikeCommentApi(commentId, currentUser.id);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: res.isLiked,
                likesCount:
                  res.likesCount !== undefined
                    ? res.likesCount
                    : Math.max(0, (c.likesCount || 0) + (res.isLiked ? 1 : -1)),
              }
            : c
        )
      );
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                isLiked: !c.isLiked,
                likesCount: c.isLiked
                  ? Math.max(0, (c.likesCount || 0) - 1)
                  : (c.likesCount || 0) + 1,
              }
            : c
        )
      );
    }
  };

  const addNewVideo = async (videoData: Partial<VideoItem>): Promise<VideoItem> => {
    const newVideoPayload: VideoItem = {
      id: 'vid_' + Date.now(),
      title: videoData.title || 'Video mới của tôi',
      description: videoData.description || '',
      videoUrl:
        videoData.videoUrl ||
        'https://res.cloudinary.com/demo/video/upload/q_auto,w_720/dog.mp4',
      thumbnailUrl:
        videoData.thumbnailUrl ||
        'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&auto=format&fit=crop&q=80',
      duration: videoData.duration || '00:15',
      views: 1,
      likes: 0,
      commentsCount: 0,
      sharesCount: 0,
      creator: currentUser,
      hashtags: videoData.hashtags || ['vclip', 'xuhuong'],
      category: videoData.category || 'Đời sống',
      location: videoData.location || 'Việt Nam',
      music: videoData.music || {
        id: 'm_def',
        title: 'Âm thanh gốc - ' + currentUser.displayName,
        artist: currentUser.displayName,
        duration: '00:15',
        audioUrl: '',
        coverUrl: currentUser.avatarUrl,
      },
      createdAt: 'Vừa xong',
      filter: videoData.filter || 'none',
      isLiked: false,
      isBookmarked: false,
      ...videoData,
    };

    const updatedList = await StorageService.saveNewVideo(newVideoPayload);
    const savedVideo = updatedList[0] || newVideoPayload;
    setVideos(updatedList);
    VideoCacheService.setVideoToMemory(savedVideo);

    const newNotif: AppNotification = {
      id: 'notif_' + Date.now(),
      userId: currentUser.id,
      type: 'upload',
      title: 'Đăng video thành công! 🎉',
      body: `Video "${savedVideo.title}" của bạn đã được xuất bản lên hệ thống VClip.`,
      targetId: savedVideo.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return savedVideo;
  };

  const deleteVideo = async (videoId: string) => {
    const updated = await StorageService.deleteVideo(videoId);
    setVideos(updated);
    showToast('Đã xóa video khỏi hệ thống', 'info');
  };

  const markNotificationRead = async (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    await notificationService.markNotificationRead(notifId);
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(unread.map((n) => notificationService.markNotificationRead(n.id)));
    showToast('Đã đánh dấu đọc tất cả thông báo', 'success');
  };

  const refreshVideos = async () => {
    const [loadedVideos, allComments, allCreators, userNotifs] = await Promise.all([
      StorageService.getVideos(currentUser.id),
      StorageService.getComments(),
      StorageService.getCreators(currentUser.id),
      notificationService.fetchNotifications(currentUser.id),
    ]);

    const syncedVideos = loadedVideos.map((v: VideoItem) => ({
      ...v,
      isLiked: likedVideoIds.has(v.id),
      isBookmarked: bookmarkedVideoIds.has(v.id),
    }));

    setVideos(syncedVideos);
    setComments(allComments);
    setCreators(
      allCreators.map((c: UserProfile) => ({
        ...c,
        isFollowing: followedUserIds.has(c.id),
        isFollowed: followedUserIds.has(c.id),
      }))
    );
    setNotifications(userNotifs);
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const selectedVideoForWatch =
    activeRoute.name === 'watch'
      ? videos.find((v) => v.id === activeRoute.videoId) || videos[0] || null
      : null;

  return (
    <AppContext.Provider
      value={{
        videos,
        creators,
        activeRoute,
        currentTab,
        currentUser,
        token,
        isLoggedIn,
        likedVideoIds,
        bookmarkedVideoIds,
        followedUserIds,
        savedFilterIds,
        savedMusicIds,
        searchPresetQuery,
        createPresetMusicId,
        comments,
        notifications,
        unreadNotificationCount,
        isLoading,
        ready,
        selectedVideoForWatch,
        signIn,
        signOut,
        patchUser,
        toggleLikeVideo,
        toggleBookmarkVideo,
        toggleFollowUser,
        toggleSaveFilter,
        toggleSaveMusic,
        incrementVideoView,
        openSearchWithQuery,
        clearSearchPresetQuery,
        openCreateWithMusic,
        clearCreatePresetMusic,
        addComment,
        toggleLikeComment,
        addNewVideo,
        deleteVideo,
        markNotificationRead,
        markAllNotificationsRead,
        navigateTo,
        setTab,
        goBack,
        refreshVideos,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp phải được sử dụng bên trong AppProvider');
  }
  return context;
};
