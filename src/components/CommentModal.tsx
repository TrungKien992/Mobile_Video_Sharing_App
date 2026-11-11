import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommentItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../utils/format';

interface CommentModalProps {
  visible: boolean;
  videoId: string;
  onClose: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({ visible, videoId, onClose }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    videos,
    comments,
    addComment,
    toggleLikeComment,
    currentUser,
    isLoggedIn,
    navigateTo,
  } = useApp();
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentVideo = videos.find((v) => v.id === videoId);
  const isCommentsAllowed = currentVideo?.commentsEnabled !== false;
  const videoComments = comments.filter((c) => c.videoId === videoId);

  const handleSendComment = async () => {
    if (!inputText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(videoId, inputText.trim());
      setInputText('');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCommentItem = ({ item }: { item: CommentItem }) => {
    const isLiked = Boolean(item.isLiked);
    const likeCount = item.likes ?? item.likesCount ?? 0;

    return (
      <View style={[styles.commentRow, { borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            onClose();
            navigateTo({ name: 'creator_profile', userId: item.user.id });
          }}
        >
          <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentHeaderRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                navigateTo({ name: 'creator_profile', userId: item.user.id });
              }}
            >
              <Text style={[styles.userName, { color: theme.text }]}>
                {item.user.displayName || item.user.username}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.commentText, { color: theme.textSecondary }]}>
            {item.text}
          </Text>
          <Text style={[styles.commentTime, { color: theme.textMuted }]}>
            {formatDateTime(item.createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.commentLikeBtn}
          onPress={() => toggleLikeComment(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? theme.accent : theme.textMuted}
          />
          {likeCount > 0 && (
            <Text
              style={[
                styles.likeCountText,
                { color: isLiked ? theme.accent : theme.textMuted },
              ]}
            >
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.surface,
              paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Bình luận ({videoComments.length})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Danh sách bình luận */}
          <FlatList
            data={videoComments}
            keyExtractor={(item) => item.id}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={44}
                  color={theme.textMuted}
                />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Chưa có bình luận nào. Hãy để lại bình luận đầu tiên!
                </Text>
              </View>
            }
          />

          {/* Form gửi bình luận */}
          {!isCommentsAllowed ? (
            <View
              style={[
                styles.loginPromptBar,
                { backgroundColor: theme.surfaceVariant, borderTopColor: theme.border },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.loginPromptText, { color: theme.textSecondary }]}>
                Tác giả đã tắt tính năng bình luận cho video này.
              </Text>
            </View>
          ) : isLoggedIn ? (
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.surface, borderTopColor: theme.border },
              ]}
            >
              <View style={styles.inputBar}>
                <Image source={{ uri: currentUser.avatarUrl }} style={styles.myAvatar} />
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.surfaceVariant,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Viết bình luận của bạn..."
                  placeholderTextColor={theme.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSendComment}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: inputText.trim()
                        ? theme.primary
                        : theme.surfaceVariant,
                    },
                  ]}
                  onPress={handleSendComment}
                  disabled={!inputText.trim() || submitting}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="send"
                    size={17}
                    color={inputText.trim() ? '#FFFFFF' : theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.loginPromptBar,
                { backgroundColor: theme.surfaceVariant, borderTopColor: theme.border },
              ]}
            >
              <Text style={[styles.loginPromptText, { color: theme.textSecondary }]}>
                Đăng nhập để gửi bình luận cho video
              </Text>
              <TouchableOpacity
                style={[styles.loginBtnSmall, { backgroundColor: theme.primary }]}
                onPress={() => {
                  onClose();
                  navigateTo({ name: 'login' });
                }}
              >
                <Text style={styles.loginBtnSmallText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    height: '72%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  avgText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingRight: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
  },
  commentLikeBtn: {
    alignItems: 'center',
    paddingLeft: 8,
    paddingTop: 2,
  },
  likeCountText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 250,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  ratingPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  loginPromptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  loginPromptText: {
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  loginBtnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  loginBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
