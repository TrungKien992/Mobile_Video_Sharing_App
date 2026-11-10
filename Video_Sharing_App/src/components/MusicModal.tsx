import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusicItem } from '../types';
import { INITIAL_MUSICS } from '../data/initialMusics';
import { useTheme } from '../context/ThemeContext';

interface MusicModalProps {
  visible: boolean;
  selectedMusicId?: string;
  onSelectMusic: (music: MusicItem) => void;
  onClose: () => void;
}

export const MusicModal: React.FC<MusicModalProps> = ({
  visible,
  selectedMusicId,
  onSelectMusic,
  onClose,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'saved'>('foryou');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const togglePreview = (id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
  };

  const renderMusicItem = ({ item }: { item: MusicItem }) => {
    const isPlaying = playingId === item.id;
    const isSelected = selectedMusicId === item.id;

    return (
      <View style={[styles.musicItemRow, isSelected && { backgroundColor: theme.primaryLight }]}>
        {/* Cover + Play overlay */}
        <TouchableOpacity
          style={styles.coverWrapper}
          onPress={() => togglePreview(item.id)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.coverUrl }} style={styles.coverImg} />
          <View style={styles.playOverlay}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

        {/* Thông tin bài hát */}
        <View style={styles.musicInfo}>
          <Text style={[styles.songTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.artistText, { color: theme.textSecondary }]}>
            {item.artist} • {item.duration}
          </Text>
        </View>

        {/* Nút "Sử dụng" */}
        <TouchableOpacity
          style={[
            styles.useBtn,
            isSelected ? styles.selectedUseBtn : { borderColor: theme.primary },
          ]}
          onPress={() => onSelectMusic(item)}
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

        {/* More options button */}
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
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
            <Text style={[styles.title, { color: theme.text }]}>Thêm âm thanh</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="search-outline" size={20} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

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
                Cho bạn
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
                Xu hướng
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
                Đã lưu
              </Text>
            </TouchableOpacity>
          </View>

          {/* Music List */}
          <FlatList
            data={INITIAL_MUSICS}
            keyExtractor={(item) => item.id}
            renderItem={renderMusicItem}
            contentContainerStyle={styles.listContent}
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
    height: 480,
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeTabBtn: {
    backgroundColor: '#FF2A6D',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  artistText: {
    fontSize: 12,
  },
  useBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
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
});
