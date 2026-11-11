import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { AIChatHistoryItem, askAIVideo } from '../api/client';
import { showToast } from '../utils/dialog';

interface AIVideoModalProps {
  visible: boolean;
  video: VideoItem;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  suggestedComment?: string;
  time: string;
}

const QUICK_PROMPTS = [
  '📌 Tóm tắt nội dung video này',
  '🌐 Dịch tiêu đề & mô tả sang tiếng Anh',
  '💬 Gợi ý bình luận hay cho video này',
  '🎵 Thông tin bài nhạc nền đang phát',
  '💡 Bí quyết quay video chủ đề này đẹp?',
];

export const AIVideoModal: React.FC<AIVideoModalProps> = ({
  visible,
  video,
  onClose,
}) => {
  const { theme } = useTheme();
  const { addComment, isLoggedIn, navigateTo } = useApp();
  const scrollViewRef = useRef<any>(null);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiSource, setAiSource] = useState<string>('Trò chuyện trực tiếp cùng Google AI');
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null);

  const getNowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
  };

  const initWelcomeMessage = () => {
    if (!video) return;
    setMessages([
      {
        id: `welcome_${video.id}`,
        sender: 'ai',
        text: `👋 Xin chào! Mình là Trợ lý Google AI trên VClip ✨\nBạn đang xem video "${video.title}" của kênh @${video.creator.displayName}.\n\nBạn có thể nhắn tin hỏi trực tiếp mình bất cứ điều gì ở ô chat bên dưới, hoặc chọn nhanh các gợi ý nhé!`,
        suggestedComment: `Video "${video.title}" cuốn quá @${video.creator.displayName} ơi! Thả 5 sao luôn ⭐❤️`,
        time: getNowTime(),
      },
    ]);
  };

  useEffect(() => {
    if (visible && video) {
      initWelcomeMessage();
    }
    // eslint-disable-nextline react-hooks/exhaustive-deps
  }, [visible, video?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendChat = async (customPrompt?: string) => {
    const q = (customPrompt !== undefined ? customPrompt : question).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: q,
      time: getNowTime(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (customPrompt === undefined) {
      setQuestion('');
    }
    setLoading(true);
    scrollToBottom();

    // Xây dựng lịch sử hội thoại để AI nhớ ngữ cảnh chat
    const history: AIChatHistoryItem[] = updatedMessages
      .filter((m) => !m.id.startsWith('welcome_'))
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const res = await askAIVideo({
        videoTitle: video.title,
        videoDescription: video.description,
        category: video.category,
        hashtags: video.hashtags,
        creatorName: video.creator.displayName,
        musicTitle: video.music?.title,
        question: q,
        history,
      });

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        suggestedComment: res.suggestedComment || undefined,
        time: getNowTime(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setAiSource(res.source || 'Google Free AI Chat');
      scrollToBottom();
    } catch {
      showToast('Không thể kết nối trợ lý AI lúc này', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePostSuggestedComment = async (msgId: string, commentText: string) => {
    if (!commentText.trim() || postingCommentId) return;
    if (!isLoggedIn) {
      onClose();
      navigateTo({
        name: 'login',
        redirectTo: { name: 'watch', videoId: video.id },
      });
      return;
    }

    setPostingCommentId(msgId);
    try {
      await addComment(video.id, commentText.trim(), 5);
      showToast('Đã đăng bình luận gợi ý từ AI thành công! 💬✨', 'success');
    } finally {
      setPostingCommentId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, { backgroundColor: theme.surface }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#5B4BFF', '#EC4899']}
                style={styles.aiBadge}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Chat trực tiếp Google AI • VClip
                </Text>
                <Text
                  style={[styles.headerSub, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  🟢 {aiSource}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                ]}
                onPress={initWelcomeMessage}
              >
                <Ionicons name="refresh" size={15} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Luồng tin nhắn Chat trực tiếp */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAi,
                  ]}
                >
                  {!isUser && (
                    <LinearGradient
                      colors={['#5B4BFF', '#EC4899']}
                      style={styles.msgAvatar}
                    >
                      <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                    </LinearGradient>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: theme.primary }]
                        : [
                            styles.aiBubble,
                            {
                              backgroundColor: theme.surfaceVariant,
                              borderColor: theme.border,
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: isUser ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {msg.text}
                    </Text>

                    {!isUser && msg.suggestedComment ? (
                      <View
                        style={[
                          styles.suggestedCommentBox,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[styles.suggestLabel, { color: theme.textMuted }]}
                          >
                            💬 Bình luận gợi ý (5★):
                          </Text>
                          <Text
                            style={[styles.suggestText, { color: theme.text }]}
                          >
                            "{msg.suggestedComment}"
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.postSuggestBtn,
                            { backgroundColor: theme.primary },
                          ]}
                          onPress={() =>
                            handlePostSuggestedComment(msg.id, msg.suggestedComment!)
                          }
                          disabled={postingCommentId === msg.id}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="send" size={12} color="#FFFFFF" />
                          <Text style={styles.postSuggestBtnText}>Đăng</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    <Text
                      style={[
                        styles.messageTime,
                        {
                          color: isUser
                            ? 'rgba(255,255,255,0.75)'
                            : theme.textMuted,
                        },
                      ]}
                    >
                      {msg.time}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.messageRowAi]}>
                <LinearGradient
                  colors={['#5B4BFF', '#EC4899']}
                  style={styles.msgAvatar}
                >
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                </LinearGradient>
                <View
                  style={[
                    styles.messageBubble,
                    styles.aiBubble,
                    {
                      backgroundColor: theme.surfaceVariant,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.primary }]}>
                      Google AI đang trả lời...
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Thanh gợi ý nhanh nằm gọn phía trên ô nhập chat */}
          <View
            style={[
              styles.quickBarWrap,
              { borderTopColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsScroll}
            >
              {QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={[
                    styles.promptChip,
                    {
                      backgroundColor: theme.surfaceVariant,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleSendChat(prompt)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.promptChipText, { color: theme.text }]}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Ô nhập tin nhắn Chat trực tiếp */}
          <View
            style={[
              styles.inputBar,
              { backgroundColor: theme.surface, borderTopColor: theme.border },
            ]}
          >
            <TextInput
              style={[
                styles.inputField,
                { backgroundColor: theme.surfaceVariant, color: theme.text },
              ]}
              placeholder="Nhắn tin trò chuyện trực tiếp với Google AI..."
              placeholderTextColor={theme.textMuted}
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={() => handleSendChat()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.askBtn,
                {
                  backgroundColor:
                    question.trim() && !loading
                      ? theme.primary
                      : theme.surfaceVariant,
                },
              ]}
              onPress={() => handleSendChat()}
              disabled={!question.trim() || loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name="send"
                size={16}
                color={question.trim() && !loading ? '#FFFFFF' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
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
  backdrop: {
    flex: 1,
  },
  modalSheet: {
    height: '76%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  apiKeyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  apiKeyInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    borderWidth: 1,
  },
  apiKeySaveBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiKeySaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 14,
    paddingBottom: 20,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  suggestedCommentBox: {
    marginTop: 10,
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  postSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  postSuggestBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  quickBarWrap: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  quickPromptsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputField: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  askBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
