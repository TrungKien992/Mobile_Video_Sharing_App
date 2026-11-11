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
import { FilterItem } from '../types';
import { INITIAL_FILTERS } from '../data/initialFilters';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

interface FilterModalProps {
  visible: boolean;
  selectedFilterId: string;
  onSelectFilter: (filter: FilterItem) => void;
  onClose: () => void;
}

const TRENDING_FILTER_IDS = ['none', 'film', 'art', 'spring', 'contrast'];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  selectedFilterId,
  onSelectFilter,
  onClose,
}) => {
  const { theme } = useTheme();
  const { savedFilterIds, toggleSaveFilter } = useApp();
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'saved'>('foryou');

  const displayedFilters = INITIAL_FILTERS.filter((f) => {
    if (activeTab === 'trending') {
      return TRENDING_FILTER_IDS.includes(f.id);
    }
    if (activeTab === 'saved') {
      return f.id === 'none' || savedFilterIds.has(f.id);
    }
    return true;
  });

  const renderFilterItem = ({ item }: { item: FilterItem }) => {
    const isSelected = item.id === selectedFilterId;
    const isSaved = savedFilterIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.filterCard}
        onPress={() => onSelectFilter(item)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.thumbnailWrapper,
            isSelected && { borderColor: '#FF2A6D', borderWidth: 2.5 },
          ]}
        >
          {item.id === 'none' ? (
            <View style={[styles.noneBox, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="ban-outline" size={26} color="#FF2A6D" />
            </View>
          ) : (
            <Image source={{ uri: item.sampleThumbnail }} style={styles.thumbnailImg} />
          )}

          {/* Lớp màu bộ lọc */}
          {item.overlayColor && item.overlayColor !== 'transparent' && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: item.overlayColor, borderRadius: 8 },
              ]}
            />
          )}

          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          )}

          {item.id !== 'none' && (
            <TouchableOpacity
              style={styles.saveFilterBtn}
              onPress={() => toggleSaveFilter(item.id)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={12}
                color={isSaved ? '#FBBF24' : '#FFFFFF'}
              />
            </TouchableOpacity>
          )}
        </View>
        <Text
          style={[
            styles.filterName,
            { color: isSelected ? '#FF2A6D' : theme.text },
          ]}
          numberOfLines={1}
        >
          {item.nameVi}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Thêm bộ lọc màu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Sub tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'foryou' && styles.activeTabBtn,
              ]}
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
                Cho bạn ({INITIAL_FILTERS.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'trending' && styles.activeTabBtn,
              ]}
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
              style={[
                styles.tabBtn,
                activeTab === 'saved' && styles.activeTabBtn,
              ]}
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
                🔖 Đã lưu ({savedFilterIds.size})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Grid */}
          <FlatList
            data={displayedFilters}
            keyExtractor={(item) => item.id}
            renderItem={renderFilterItem}
            numColumns={4}
            contentContainerStyle={styles.gridContent}
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
    height: 390,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 50,
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
  closeBtn: {
    padding: 4,
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
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  filterCard: {
    flex: 1 / 4,
    alignItems: 'center',
    marginVertical: 8,
  },
  thumbnailWrapper: {
    width: 66,
    height: 66,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  noneBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2A6D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFilterBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
