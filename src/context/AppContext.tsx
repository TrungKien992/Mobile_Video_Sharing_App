import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  deleteComment: (commentId: string) => Promise<void>;
  toggleLikeComment: (commentId: string) => Promise<void>;
  addNewVideo: (videoData: Partial<VideoItem>) => Promise<VideoItem>;
  deleteVideo: (videoId: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  navigateTo: (route: ScreenRoute) => void;
  completePostAndWatch: (videoId: string) => void;
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
          activeUserFromDb ? dbLikedIds : storedLikedIds
        );
        const bookmarkedSet = new Set<string>(
          activeUserFromDb ? dbBookmarkedIds : storedBookmarkedIds
        );
        const followedSet = new Set<string>(
          activeUserFromDb
            ? activeUserFromDb.followingIds || []
            : storedFollowedIds
        );

        const commentCountsByVideo = allComments.reduce<Record<string, number>>((acc, c) => {
          acc[c.videoId] = (acc[c.videoId] || 0) + 1;
          return acc;
        }, {});

        const syncedVideos = loadedVideos.map((v: VideoItem) => ({
          ...v,
          isLiked: likedSet.has(v.id),
          isBookmarked: bookmarkedSet.has(v.id),
          commentsCount: commentCountsByVideo[v.id] || 0,
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

  const navRef = useRef<{
    activeRoute: ScreenRoute;
    currentTab: MainTabType;
    lastMainTab: MainTabType;
    history: ScreenRoute[];
  }>({
    activeRoute: { name: 'main', tab: 'home' },
    currentTab: 'home',
    lastMainTab: 'home',
    history: [],
  });
  const isPopStateRef = useRef(false);

  const isSameRoute = useCallback((a: ScreenRoute, b: ScreenRoute): boolean => {
    if (a.name !== b.name) return false;
    switch (a.name) {
      case 'main':
        return b.name === 'main' && (a.tab || 'home') === (b.tab || 'home');
      case 'watch':
      case 'live':
        return (b.name === 'watch' || b.name === 'live') && a.videoId === b.videoId;
      case 'creator_profile':
        return b.name === 'creator_profile' && a.userId === b.userId;
      case 'follow_list':
        return (
          b.name === 'follow_list' &&
          a.userId === b.userId &&
          (a.initialTab || 'following') === (b.initialTab || 'following')
        );
      default:
        return true;
    }
  }, []);

  const syncNavState = useCallback(
    (
      nextRoute: ScreenRoute,
      nextTab: MainTabType,
      nextHistory: ScreenRoute[],
      historyMode: 'push' | 'replace' | 'none' = 'none'
    ) => {
      navRef.current.activeRoute = nextRoute;
      navRef.current.currentTab = nextTab;
      if (nextTab !== 'create') {
        navRef.current.lastMainTab = nextTab;
      }
      navRef.current.history = nextHistory;

      setActiveRoute(nextRoute);
      setCurrentTab(nextTab);
      setRouteHistory(nextHistory);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && !isPopStateRef.current) {
        try {
          if (historyMode === 'push' && window.history?.pushState) {
            window.history.pushState({ route: nextRoute, tab: nextTab }, '');
          } else if (historyMode === 'replace' && window.history?.replaceState) {
            window.history.replaceState({ route: nextRoute, tab: nextTab }, '');
          }
        } catch {}
      }
    },
    []
  );

  const setTab = useCallback(
    (tab: MainTabType) => {
      if (tab === 'create') {
        const curRoute = navRef.current.activeRoute;
        const baseRoute: ScreenRoute = {
          name: 'main',
          tab: navRef.current.lastMainTab || 'home',
        };
        const nextHistory =
          curRoute.name === 'main' ? [baseRoute] : [baseRoute, curRoute];
        syncNavState({ name: 'main', tab: 'create' }, 'create', nextHistory, 'push');
        return;
      }
      // Chuyển về 1 trong 4 Tab gốc ('home', 'search', 'friends', 'profile') -> xóa sạch stack trung gian cũ
      syncNavState({ name: 'main', tab }, tab, [], 'replace');
    },
    [syncNavState]
  );

  const navigateTo = useCallback(
    (route: ScreenRoute) => {
      if (route.name === 'main') {
        setTab(route.tab || 'home');
        return;
      }

      const curRoute = navRef.current.activeRoute;
      const curTab = navRef.current.currentTab;
      const curHistory = navRef.current.history;

      if (isSameRoute(curRoute, route)) {
        syncNavState(route, curTab, curHistory, 'replace');
        return;
      }

      // Chuyển đổi qua lại giữa Login <-> Register hoặc thoát khỏi màn hình Auth: không lưu màn hình Auth vào lịch sử
      if (curRoute.name === 'login' || curRoute.name === 'register') {
        const redirectTo =
          route.name === 'login' || route.name === 'register'
            ? route.redirectTo || curRoute.redirectTo
            : undefined;
        const nextRoute = redirectTo ? { ...route, redirectTo } : route;
        syncNavState(nextRoute, curTab, curHistory, 'replace');
        return;
      }

      const currentNormalized: ScreenRoute =
        curRoute.name === 'main'
          ? { name: 'main', tab: curTab }
          : curRoute;

      // Nếu route đích đã có sẵn trong history -> thu gọn stack tới vị trí đó để tránh lặp vòng tròn
      const existingIndex = curHistory.findIndex((r) => isSameRoute(r, route));
      let nextHistory: ScreenRoute[];
      if (existingIndex >= 0) {
        nextHistory = curHistory.slice(0, existingIndex);
      } else {
        const lastInHistory = curHistory[curHistory.length - 1];
        nextHistory =
          lastInHistory && isSameRoute(lastInHistory, currentNormalized)
            ? [...curHistory]
            : [...curHistory, currentNormalized];
      }

      syncNavState(route, curTab, nextHistory, 'push');
    },
    [isSameRoute, setTab, syncNavState]
  );

  const goBack = useCallback(() => {
    const curHistory = navRef.current.history;
    const curRoute = navRef.current.activeRoute;
    const curTab = navRef.current.currentTab;
    const lastMain = navRef.current.lastMainTab || 'home';

    if (curHistory.length > 0) {
      const prev = curHistory[curHistory.length - 1];
      const remaining = curHistory.slice(0, -1);

      if (prev.name === 'main') {
        const targetTab = prev.tab || lastMain;
        const cleanedHistory = targetTab === 'create' ? remaining : [];
        syncNavState({ name: 'main', tab: targetTab }, targetTab, cleanedHistory, 'replace');
      } else {
        const nextTab = curTab === 'create' ? lastMain : curTab;
        syncNavState(prev, nextTab, remaining, 'replace');
      }
      return true;
    }

    if (curRoute.name !== 'main' || curTab === 'create') {
      syncNavState({ name: 'main', tab: lastMain }, lastMain, [], 'replace');
      return true;
    }

    if (curTab !== 'home') {
      syncNavState({ name: 'main', tab: 'home' }, 'home', [], 'replace');
      return true;
    }

    return false;
  }, [syncNavState]);

  const completePostAndWatch = useCallback(
    (videoId: string) => {
      // Sau khi đăng video mới: đặt duy nhất Trang chủ ('home') ở dưới đáy lịch sử
      // Để khi ấn nút Quay lại (Back) sẽ về thẳng Trang chủ ngay lập tức, không nhảy lung tung!
      const homeRoute: ScreenRoute = { name: 'main', tab: 'home' };
      navRef.current.lastMainTab = 'home';
      syncNavState({ name: 'watch', videoId }, 'home', [homeRoute], 'replace');
    },
    [syncNavState]
  );

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
        isPopStateRef.current = true;
        goBack();
        isPopStateRef.current = false;
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [goBack]);

  const openSearchWithQuery = useCallback(
    (query: string) => {
      setSearchPresetQuery(query.replace(/^#/, '').trim());
      const curRoute = navRef.current.activeRoute;
      const baseHistory: ScreenRoute[] =
        curRoute.name !== 'main'
          ? [{ name: 'main', tab: navRef.current.lastMainTab || 'home' }, curRoute]
          : [];
      syncNavState({ name: 'main', tab: 'search' }, 'search', baseHistory, 'push');
    },
    [syncNavState]
  );

  const clearSearchPresetQuery = useCallback(() => {
    setSearchPresetQuery('');
  }, []);

  const openCreateWithMusic = useCallback(
    (musicId: string) => {
      setCreatePresetMusicId(musicId);
      const curRoute = navRef.current.activeRoute;
      const baseRoute: ScreenRoute = {
        name: 'main',
        tab: navRef.current.lastMainTab || 'home',
      };
      const nextHistory =
        curRoute.name === 'main' ? [baseRoute] : [baseRoute, curRoute];
      syncNavState({ name: 'main', tab: 'create' }, 'create', nextHistory, 'push');
    },
    [syncNavState]
  );

  const clearCreatePresetMusic = useCallback(() => {
    setCreatePresetMusicId(null);
  }, []);

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
  };

  const toggleFollowUser = async (targetUserId: string) => {
    const targetCreator = creators.find((c) => c.id === targetUserId);
    const { isFollowed, allFollowedIds } = await StorageService.toggleFollowUser(
      targetUserId,
      currentUser.id
    );
    setFollowedUserIds(new Set<string>(allFollowedIds));

    const delta = isFollowed ? 1 : -1;
    const syncCreatorFollow = (c: UserProfile): UserProfile => {
      if (c.id !== targetUserId) return c;
      const existingFollowerIds = Array.isArray(c.followerIds) ? c.followerIds : [];
      const nextFollowerIds = isFollowed
        ? Array.from(new Set([...existingFollowerIds, currentUser.id]))
        : existingFollowerIds.filter((id) => id !== currentUser.id);
      const nextFollowersCount = Array.isArray(c.followerIds)
        ? nextFollowerIds.length
        : Math.max(0, (c.followersCount || 0) + delta);
      return {
        ...c,
        isFollowing: isFollowed,
        isFollowed,
        followerIds: nextFollowerIds,
        followersCount: nextFollowersCount,
        followers: nextFollowersCount,
      };
    };

    setCreators((prev) =>
      prev.map((c) => {
        if (c.id === targetUserId) return syncCreatorFollow(c);
        if (c.id === currentUser.id) {
          return {
            ...c,
            followingIds: allFollowedIds,
            followingCount: allFollowedIds.length,
            following: allFollowedIds.length,
          };
        }
        return c;
      })
    );
    setVideos((prev) =>
      prev.map((v) =>
        v.creator?.id === targetUserId
          ? { ...v, creator: syncCreatorFollow(v.creator) }
          : v
      )
    );
    setCurrentUser((prev) => ({
      ...prev,
      followingIds: allFollowedIds,
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
    return newComment;
  };

  const deleteComment = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    await StorageService.deleteComment(commentId, currentUser.id);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (target?.videoId) {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === target.videoId
            ? { ...v, commentsCount: Math.max(0, (v.commentsCount || 0) - 1) }
            : v
        )
      );
    }
    showToast('Đã xóa bình luận', 'info');
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
    const chosenMusic = videoData.music;
    const resolvedMusic =
      chosenMusic && chosenMusic.id === 'none'
        ? {
            id: 'none',
            title: 'Âm thanh gốc',
            artist: currentUser.displayName,
            duration: videoData.duration || '00:15',
            audioUrl: '',
            coverUrl: currentUser.avatarUrl,
          }
        : chosenMusic || {
            id: 'none',
            title: 'Âm thanh gốc',
            artist: currentUser.displayName,
            duration: videoData.duration || '00:15',
            audioUrl: '',
            coverUrl: currentUser.avatarUrl,
          };

    const newVideoPayload: VideoItem = {
      ...videoData,
      id: videoData.id || 'vid_' + Date.now(),
      title: videoData.title || '',
      description: videoData.description || '',
      videoUrl: videoData.videoUrl || '',
      thumbnailUrl: videoData.thumbnailUrl || '',
      duration: videoData.duration || '00:15',
      views: 0,
      likes: 0,
      commentsCount: 0,
      sharesCount: 0,
      creator: currentUser,
      hashtags: Array.isArray(videoData.hashtags) ? videoData.hashtags : [],
      category: videoData.category || '',
      location: videoData.location || 'Việt Nam',
      music: resolvedMusic,
      createdAt: 'Vừa xong',
      filter: videoData.filter || 'none',
      isLiked: false,
      isBookmarked: false,
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

    const commentCountsByVideo = allComments.reduce<Record<string, number>>((acc, c) => {
      acc[c.videoId] = (acc[c.videoId] || 0) + 1;
      return acc;
    }, {});

    const syncedVideos = loadedVideos.map((v: VideoItem) => ({
      ...v,
      isLiked: likedVideoIds.has(v.id),
      isBookmarked: bookmarkedVideoIds.has(v.id),
      commentsCount: commentCountsByVideo[v.id] || 0,
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
        deleteComment,
        toggleLikeComment,
        addNewVideo,
        deleteVideo,
        markNotificationRead,
        markAllNotificationsRead,
        navigateTo,
        completePostAndWatch,
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
