import React, { useRef, useState } from 'react';
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
  PanResponder,
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
    deleteComment,
    toggleLikeComment,
    currentUser,
    isLoggedIn,
    navigateTo,
    setTab,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCommentForAction, setSelectedCommentForAction] = useState<CommentItem | null>(null);

  // Kéo xuống từ thanh tiêu đề để đóng bảng bình luận
  const dragDownPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy > 12 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > 30) {
          onClose();
        }
      },
    })
  ).current;

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

  const handleGoToProfile = (comment: CommentItem) => {
    const targetUserId =
      comment.user?.id ||
      (comment as any).userId ||
      (comment.user as any)?._id;
    if (!targetUserId) return;

    onClose();
    setTimeout(() => {
      if (targetUserId === currentUser.id) {
        setTab('profile');
      } else {
        navigateTo({ name: 'creator_profile', userId: targetUserId });
      }
    }, 160);
  };

  const handleConfirmDelete = async (commentId: string) => {
    setSelectedCommentForAction(null);
    try {
      await deleteComment(commentId);
    } catch {}
  };

  const renderCommentItem = ({ item }: { item: CommentItem }) => {
    const isLiked = Boolean(item.isLiked);
    const likeCount = item.likes ?? item.likesCount ?? 0;
    const isMyComment =
      (item.user && item.user.id === currentUser.id) ||
      (item as any).userId === currentUser.id;

    return (
      <View style={[styles.commentRow, { borderBottomColor: theme.divider }]}>
        {/* Avatar người bình luận - Bấm vào mở hồ sơ */}
        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => handleGoToProfile(item)}
        >
          <Image
            source={{
              uri:
                item.user?.avatarUrl ||
                (item as any).userAvatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
            }}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>

        {/* Nội dung bình luận - Nhấn giữ để mở tùy chọn xóa / sao chép */}
        <TouchableOpacity
          activeOpacity={0.88}
          delayLongPress={300}
          onLongPress={() => setSelectedCommentForAction(item)}
          style={styles.commentContent}
        >
          <View style={styles.commentHeaderRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => handleGoToProfile(item)}
            >
              <Text style={[styles.userName, { color: theme.text }]}>
                {item.user?.displayName || item.user?.username || (item as any).userName || 'Người dùng'}
              </Text>
            </TouchableOpacity>

            {isMyComment && (
              <View style={[styles.myBadge, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.myBadgeText, { color: theme.primary }]}>Bạn</Text>
              </View>
            )}
          </View>

          <Text style={[styles.commentText, { color: theme.textSecondary }]}>
            {item.text}
          </Text>

          <View style={styles.commentFooterRow}>
            <Text style={[styles.commentTime, { color: theme.textMuted }]}>
              {formatDateTime(item.createdAt)}
            </Text>
            <Text style={[styles.commentTip, { color: theme.textMuted }]}>
              • Nhấn giữ để thao tác
            </Text>
          </View>
        </TouchableOpacity>

        {/* Nút thích bình luận */}
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
          <View
            style={[styles.sheetHeader, { borderBottomColor: theme.border }]}
            {...dragDownPanResponder.panHandlers}
          >
            <View style={styles.sheetHandleBar} />
            <View style={styles.headerTitleRow}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Bình luận ({videoComments.length})
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Danh sách bình luận */}
          <FlatList
            data={videoComments}
            keyExtractor={(item) => item.id}
            renderItem={renderCommentItem}
            style={{ flex: 1 }}
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

          {/* Action Sheet Menu khi Nhấn Giữ vào Bình luận */}
          {selectedCommentForAction && (
            <View style={styles.actionSheetOverlay}>
              <TouchableOpacity
                style={styles.actionSheetBackdrop}
                activeOpacity={1}
                onPress={() => setSelectedCommentForAction(null)}
              />
              <View
                style={[
                  styles.actionSheetContainer,
                  { backgroundColor: theme.surface, borderTopColor: theme.border },
                ]}
              >
                <View style={styles.actionSheetHandle} />

                <Text style={[styles.actionSheetTitle, { color: theme.text }]}>
                  Tùy chọn bình luận
                </Text>

                {/* Trích dẫn nội dung bình luận đang chọn */}
                <View
                  style={[
                    styles.previewCommentBox,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[styles.previewCommentText, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    "{selectedCommentForAction.text}"
                  </Text>
                </View>

                {/* Nút Xóa bình luận (Chỉ hiển thị nếu là bình luận của bản thân) */}
                {((selectedCommentForAction.user &&
                  selectedCommentForAction.user.id === currentUser.id) ||
                  (selectedCommentForAction as any).userId === currentUser.id) ? (
                  <TouchableOpacity
                    style={[styles.actionItem, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                    onPress={() => handleConfirmDelete(selectedCommentForAction.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.actionIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.actionItemTextCol}>
                      <Text style={[styles.actionItemTitle, { color: '#EF4444' }]}>
                        Xóa bình luận này
                      </Text>
                      <Text style={[styles.actionItemSub, { color: theme.textMuted }]}>
                        Xóa vĩnh viễn khỏi video và cơ sở dữ liệu
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Nút Xem trang cá nhân tác giả bình luận */}
                <TouchableOpacity
                  style={[styles.actionItem, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => {
                    const c = selectedCommentForAction;
                    setSelectedCommentForAction(null);
                    handleGoToProfile(c);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: theme.surface }]}>
                    <Ionicons name="person" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.actionItemTextCol}>
                    <Text style={[styles.actionItemTitle, { color: theme.text }]}>
                      Xem trang cá nhân
                    </Text>
                    <Text style={[styles.actionItemSub, { color: theme.textMuted }]}>
                      Đến hồ sơ của {selectedCommentForAction.user?.displayName || 'tác giả'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Nút Đóng / Hủy */}
                <TouchableOpacity
                  style={[styles.cancelActionBtn, { borderColor: theme.border }]}
                  onPress={() => setSelectedCommentForAction(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelActionText, { color: theme.textSecondary }]}>
                    Hủy bỏ
                  </Text>
                </TouchableOpacity>
              </View>
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
    height: '52%',
    maxHeight: '55%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
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
    marginBottom: 4,
    paddingRight: 8,
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  myBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  myBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  commentTime: {
    fontSize: 11,
  },
  commentTip: {
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
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loginPromptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  loginPromptText: {
    fontSize: 13,
    flex: 1,
  },
  loginBtnSmall: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  loginBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Action Sheet styles khi nhấn giữ */
  actionSheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 99,
  },
  actionSheetBackdrop: {
    flex: 1,
  },
  actionSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewCommentBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  previewCommentText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionItemTextCol: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  cancelActionBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
