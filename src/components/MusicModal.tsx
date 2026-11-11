import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer } from 'expo-video';
import { MusicItem } from '../types';
import { INITIAL_MUSICS } from '../data/initialMusics';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

interface MusicModalProps {
  visible: boolean;
  selectedMusicId?: string;
  onSelectMusic: (music: MusicItem) => void;
  onClose: () => void;
}

const TRENDING_MUSIC_IDS = ['m1', 'm2', 'm4', 'm6'];

export const MusicModal: React.FC<MusicModalProps> = ({
  visible,
  selectedMusicId,
  onSelectMusic,
  onClose,
}) => {
  const { theme } = useTheme();
  const { savedMusicIds, toggleSaveMusic } = useApp();
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'saved'>('foryou');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  const activePreviewSong = INITIAL_MUSICS.find((m) => m.id === playingId);
  const nativeAudioPlayer = useVideoPlayer(
    Platform.OS === 'web' ? null : activePreviewSong?.audioUrl || null,
    (p) => {
      p.loop = true;
      if (playingId) {
        p.play();
      }
    }
  );

  // Quản lý phát nhạc thực tế khi bấm nút nghe thử (Preview)
  useEffect(() => {
    if (!visible) {
      setPlayingId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      if (playingId && activePreviewSong?.audioUrl && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(activePreviewSong.audioUrl);
          audio.loop = true;
          audio.volume = 0.8;
          audio.play().catch(() => {});
          webAudioRef.current = audio;
        } catch {}
      }
      return () => {
        if (webAudioRef.current) {
          webAudioRef.current.pause();
          webAudioRef.current = null;
        }
      };
    } else {
      try {
        if (playingId && activePreviewSong?.audioUrl) {
          nativeAudioPlayer.play();
        } else {
          nativeAudioPlayer.pause();
        }
      } catch {}
    }
  }, [playingId, activePreviewSong, nativeAudioPlayer]);

  const togglePreview = (id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
  };

  const filteredMusics = INITIAL_MUSICS.filter((m) => {
    if (activeTab === 'trending' && !TRENDING_MUSIC_IDS.includes(m.id)) {
      return false;
    }
    if (activeTab === 'saved' && !savedMusicIds.has(m.id)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderMusicItem = ({ item }: { item: MusicItem }) => {
    const isPlaying = playingId === item.id;
    const isSelected = selectedMusicId === item.id;
    const isSaved = savedMusicIds.has(item.id);

    return (
      <View
        style={[
          styles.musicItemRow,
          isSelected && { backgroundColor: theme.primaryLight },
        ]}
      >
        {/* Cover + Play overlay thực tế */}
        <TouchableOpacity
          style={styles.coverWrapper}
          onPress={() => togglePreview(item.id)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.coverUrl }} style={styles.coverImg} />
          <View
            style={[
              styles.playOverlay,
              isPlaying && { backgroundColor: 'rgba(255, 42, 109, 0.55)' },
            ]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

        {/* Thông tin bài hát */}
        <TouchableOpacity
          style={styles.musicInfo}
          activeOpacity={0.8}
          onPress={() => togglePreview(item.id)}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {isPlaying && (
              <View style={styles.playingBadge}>
                <Ionicons name="volume-high" size={11} color="#FF2A6D" />
                <Text style={styles.playingBadgeText}>Đang phát</Text>
              </View>
            )}
          </View>
          <Text style={[styles.artistText, { color: theme.textSecondary }]}>
            {item.artist} • {item.duration}
          </Text>
        </TouchableOpacity>

        {/* Nút "Sử dụng" */}
        <TouchableOpacity
          style={[
            styles.useBtn,
            isSelected ? styles.selectedUseBtn : { borderColor: theme.primary },
          ]}
          onPress={() => {
            setPlayingId(null);
            onSelectMusic(item);
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.useBtnText,
              isSelected ? styles.selectedUseBtnText : { color: theme.primary },
            ]}
          >
            {isSelected ? 'Đã chọn' : 'Sử dụng'}
          </Text>
        </TouchableOpacity>

        {/* Nút Lưu nhạc yêu thích */}
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => toggleSaveMusic(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={19}
            color={isSaved ? '#F59E0B' : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Kho Âm thanh VClip</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowSearch((s) => !s)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={showSearch ? '#FF2A6D' : theme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Thanh tìm kiếm bài hát */}
          {showSearch && (
            <View style={[styles.searchBox, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="search" size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Tìm theo tên bài hát hoặc nghệ sĩ..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sub tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'foryou' && styles.activeTabBtn]}
              onPress={() => setActiveTab('foryou')}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'foryou'
                    ? styles.activeTabBtnText
                    : { color: theme.textSecondary },
                ]}
              >
                Cho bạn ({INITIAL_MUSICS.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'trending' && styles.activeTabBtn]}
              onPress={() => setActiveTab('trending')}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'trending'
                    ? styles.activeTabBtnText
                    : { color: theme.textSecondary },
                ]}
              >
                🔥 Xu hướng
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'saved' && styles.activeTabBtn]}
              onPress={() => setActiveTab('saved')}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'saved'
                    ? styles.activeTabBtnText
                    : { color: theme.textSecondary },
                ]}
              >
                🔖 Đã lưu ({savedMusicIds.size})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Music List */}
          <FlatList
            data={filteredMusics}
            keyExtractor={(item) => item.id}
            renderItem={renderMusicItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="musical-notes-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Không tìm thấy giai điệu phù hợp
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalSheet: {
    height: 500,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  tabBtn: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeTabBtn: {
    backgroundColor: '#FF2A6D',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabBtnText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  musicItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  coverWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicInfo: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 42, 109, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  playingBadgeText: {
    color: '#FF2A6D',
    fontSize: 9,
    fontWeight: '800',
  },
  artistText: {
    fontSize: 12,
  },
  useBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  selectedUseBtn: {
    backgroundColor: '#FF2A6D',
    borderWidth: 0,
  },
  useBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedUseBtnText: {
    color: '#FFFFFF',
  },
  moreBtn: {
    padding: 6,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
});
