export interface UserProfile {
  id: string;
  name: string;
  displayName: string;
  username: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  followers?: number;
  following?: number;
  likes?: number;
  followingIds?: string[];
  followerIds?: string[];
  isFollowed?: boolean;
  isFollowing?: boolean;
  isVerified?: boolean;
}

export type User = UserProfile;

export interface MusicItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  audioUrl: string;
  coverUrl: string;
}

export interface LiveProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  soldCount: number;
  imageUrl: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration?: string;
  views: number;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  creator: UserProfile;
  hashtags: string[];
  music: MusicItem;
  createdAt: string;
  filter?: string;
  category?: string;
  location?: string;
  privacy?: 'all' | 'friends' | 'private';
  commentsEnabled?: boolean;
  isLive?: boolean;
  liveViewerCount?: number;
  liveProduct?: LiveProduct;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface CommentItem {
  id: string;
  videoId: string;
  user: UserProfile;
  rating?: number;
  text: string;
  createdAt: string;
  likesCount: number;
  likes?: number;
  isLiked?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  type?: 'like' | 'comment' | 'follow' | 'upload' | 'system';
  title: string;
  body: string;
  targetId?: string;
  createdAt: string;
  read: boolean;
  target?: {
    screen: 'watch' | 'creator_profile' | 'main';
    videoId?: string;
    creatorId?: string;
  };
}

export interface FilterItem {
  id: string;
  name: string;
  nameVi: string;
  overlayColor?: string;
  filterStyle?: {
    tintColor?: string;
    opacity?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
  };
  sampleThumbnail: string;
}

export interface TopicItem {
  id: string;
  name: string;
  nameVi: string;
  icon: string;
  color: string;
  badgeCount?: string;
}

export interface VideoDraft {
  id: string;
  title: string;
  description: string;
  videoUri: string;
  coverUri?: string;
  hashtags: string[];
  category?: string;
  filter?: string;
  musicId?: string;
  commentsEnabled: boolean;
  privacy: 'all' | 'friends' | 'private';
  alsoPostOn: {
    facebook: boolean;
    twitter: boolean;
    instagram: boolean;
  };
  createdAt: string;
}

export type MainTabType = 'home' | 'search' | 'create' | 'friends' | 'profile';

export type ScreenRoute =
  | { name: 'main'; tab?: MainTabType }
  | { name: 'watch'; videoId: string }
  | { name: 'live'; videoId: string }
  | { name: 'create_post'; draftVideoUri?: string; selectedFilterId?: string; selectedMusicId?: string }
  | { name: 'creator_profile'; userId: string }
  | { name: 'follow_list'; userId: string; initialTab?: 'followers' | 'following' }
  | { name: 'login'; redirectTo?: ScreenRoute }
  | { name: 'register'; redirectTo?: ScreenRoute }
  | { name: 'edit_profile' }
  | { name: 'notifications' }
  | { name: 'wishlist' };
