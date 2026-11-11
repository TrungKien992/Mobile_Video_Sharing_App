import { useApp } from '../context/AppContext';

export function useAuth() {
  const { currentUser, token, isLoggedIn, signIn, signOut, patchUser } = useApp();
  return {
    user: isLoggedIn ? currentUser : null,
    currentUser,
    token,
    isLoggedIn,
    signIn,
    signOut,
    patchUser,
  };
}

export function useWishlist() {
  const { likedVideoIds, bookmarkedVideoIds, toggleLikeVideo, toggleBookmarkVideo } = useApp();
  return {
    ids: Array.from(likedVideoIds),
    bookmarkedIds: Array.from(bookmarkedVideoIds),
    isFavorite: (id: string) => likedVideoIds.has(id),
    isBookmarked: (id: string) => bookmarkedVideoIds.has(id),
    toggle: toggleLikeVideo,
    toggleBookmark: toggleBookmarkVideo,
  };
}

export function useNotifications() {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();
  return {
    items: notifications,
    unreadCount: unreadNotificationCount,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
  };
}
