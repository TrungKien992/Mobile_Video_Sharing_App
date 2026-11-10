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

interface FilterModalProps {
  visible: boolean;
  selectedFilterId: string;
  onSelectFilter: (filter: FilterItem) => void;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  selectedFilterId,
  onSelectFilter,
  onClose,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'saved'>('foryou');

  const renderFilterItem = ({ item }: { item: FilterItem }) => {
    const isSelected = item.id === selectedFilterId;

    return (
      <TouchableOpacity
        style={styles.filterCard}
        onPress={() => onSelectFilter(item)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.thumbnailWrapper,
            isSelected && { borderColor: '#FF2A6D', borderWidth: 2 },
          ]}
        >
          {item.id === 'none' ? (
            <View style={[styles.noneBox, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="ban-outline" size={26} color="#FF2A6D" />
            </View>
          ) : (
            <Image source={{ uri: item.sampleThumbnail }} style={styles.thumbnailImg} />
          )}

          {/* Lớp màu giả lập bộ lọc */}
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
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
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
            <Text style={[styles.title, { color: theme.text }]}>Thêm bộ lọc</Text>
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
                Cho bạn
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
                Xu hướng
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
                Đã lưu
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Grid */}
          <FlatList
            data={INITIAL_FILTERS}
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
    height: 380,
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
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2A6D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterName: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});
