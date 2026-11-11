import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../services/storageService';
import { SAMPLE_UPLOAD_VIDEOS } from '../data/initialVideos';
import { VideoPlayer } from '../components/VideoPlayer';
import { uploadFile } from '../api/client';
import { showMessage, showToast } from '../utils/dialog';
import { VideoDraft } from '../types';

interface PostVideoScreenProps {
  draftVideoUri?: string;
}

const CATEGORIES = [
  'Thú cưng',
  'Thể thao',
  'Thiên nhiên',
  'Ẩm thực',
  'Giải trí',
  'Đời sống',
];

export const PostVideoScreen: React.FC<PostVideoScreenProps> = ({ draftVideoUri }) => {
  const { addNewVideo, goBack, navigateTo } = useApp();
  const { theme } = useTheme();

  const initialSample =
    SAMPLE_UPLOAD_VIDEOS.find((s) => s.videoUrl === draftVideoUri) ||
    SAMPLE_UPLOAD_VIDEOS[0];

  const [videoUrl, setVideoUrl] = useState<string>(
    draftVideoUri || initialSample.videoUrl
  );
  const [coverPhotoUri, setCoverPhotoUri] = useState<string>(
    initialSample.thumbnailUrl
  );
  const [title, setTitle] = useState<string>('Khoảnh khắc thú vị hôm nay ✨');
  const [description, setDescription] = useState<string>(
    'Video quay thực tế độ phân giải HD chia sẻ lên cộng đồng VClip!'
  );
  const [category, setCategory] = useState<string>('Thú cưng');
  const [hashtags, setHashtags] = useState<string[]>(['vclip', 'xuhuong', 'videohd']);
  const [newTagInput, setNewTagInput] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<VideoDraft[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    StorageService.getDrafts().then(setSavedDrafts);
  }, []);

  const handleSelectSample = (sample: (typeof SAMPLE_UPLOAD_VIDEOS)[0]) => {
    setVideoUrl(sample.videoUrl);
    setCoverPhotoUri(sample.thumbnailUrl);
    if (!title.trim() || title === 'Khoảnh khắc thú vị hôm nay ✨') {
      setTitle(sample.label);
    }
  };

  const handleWebFileUpload = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploadingLocal(true);
    try {
      const res = await uploadFile(file);
      setVideoUrl(res.url);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      showMessage(
        'Đã tải file lên Server ✅',
        `File "${file.name}" đã được lưu tại ${res.url}`
      );
    } catch {
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      showMessage('Đã nạp video', `Đã chọn file "${file.name}" từ máy tính.`);
    } finally {
      setUploadingLocal(false);
    }
  };

  const handleAddHashtag = () => {
    if (newTagInput.trim()) {
      const cleanTag = newTagInput.replace('#', '').trim();
      if (!hashtags.includes(cleanTag)) {
        setHashtags([...hashtags, cleanTag]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((t) => t !== tagToRemove));
  };

  const handleSaveDraft = async () => {
    const updated = await StorageService.saveDraft({
      id: 'draft_' + Date.now(),
      title: title || 'Bản nháp chưa đặt tên',
      description,
      videoUri: videoUrl,
      coverUri: coverPhotoUri,
      hashtags,
      commentsEnabled,
      privacy: 'all',
      alsoPostOn: {
        facebook: true,
        twitter: false,
        instagram: true,
      },
      createdAt: new Date().toISOString(),
    });
    setSavedDrafts(updated);
    showToast('Đã lưu bản nháp vào bộ nhớ 📂', 'success');
  };

  const handleLoadDraft = (draft: VideoDraft) => {
    setTitle(draft.title);
    setDescription(draft.description);
    if (draft.videoUri) setVideoUrl(draft.videoUri);
    if (draft.coverUri) setCoverPhotoUri(draft.coverUri);
    if (draft.hashtags?.length) setHashtags(draft.hashtags);
    setCommentsEnabled(draft.commentsEnabled);
    showToast(`Đã nạp bản nháp "${draft.title}"`, 'info');
  };

  const handleDeleteDraft = async (draftId: string) => {
    const next = await StorageService.deleteDraft(draftId);
    setSavedDrafts(next);
    showToast('Đã xóa bản nháp', 'info');
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showMessage('Thiếu thông tin', 'Vui lòng nhập tiêu đề cho video của bạn!');
      return;
    }
    if (!videoUrl.trim()) {
      showMessage('Thiếu video', 'Vui lòng chọn hoặc tải lên một video!');
      return;
    }

    setPublishing(true);
    try {
      const created = await addNewVideo({
        title: title.trim(),
        description: description.trim() || title.trim(),
        videoUrl: videoUrl.trim(),
        thumbnailUrl: coverPhotoUri,
        category,
        hashtags,
        duration: '00:18',
      });

      showMessage(
        'Đăng video thành công! 🎉',
        `Video "${created.title}" đã được lưu vào MongoDB và xuất hiện trên trang Khám phá & Hồ sơ cá nhân (không bị mất khi F5).`
      );
      navigateTo({ name: 'watch', videoId: created.id });
    } catch (err: any) {
      showMessage('Lỗi đăng video', err?.message || 'Không thể đăng video');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {Platform.OS === 'web' && (
        // @ts-ignore
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/*"
          style={{ display: 'none' }}
          onChange={handleWebFileUpload}
        />
      )}

      {/* 1. Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Xuất bản Video mới
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Danh sách bản nháp đã lưu (nếu có) */}
        {savedDrafts.length > 0 && (
          <View
            style={[
              styles.previewCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sourceTitle, { color: theme.text }]}>
              📂 Bản nháp đã lưu ({savedDrafts.length})
            </Text>
            <View style={{ gap: 6, marginTop: 6 }}>
              {savedDrafts.map((d) => (
                <View
                  key={d.id}
                  style={[
                    styles.sampleChip,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => handleLoadDraft(d)}
                  >
                    <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                    <Text
                      style={[styles.sampleChipLabel, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteDraft(d.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={15} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 2. Xem trước Video thực + Chọn nguồn Video */}
        <View
          style={[
            styles.previewCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.previewRow}>
            <View style={styles.videoPreviewBox}>
              <VideoPlayer
                videoUrl={videoUrl}
                thumbnailUrl={coverPhotoUri}
                isPlaying={true}
                isLooping={true}
                showControls={false}
              />
              <View style={styles.realBadge}>
                <Text style={styles.realBadgeText}>LIVE PREVIEW</Text>
              </View>
            </View>

            <View style={styles.sourcePickCol}>
              <Text style={[styles.sourceTitle, { color: theme.text }]}>
                Nguồn Video (.MP4 thực)
              </Text>
              <Text style={[styles.sourceSub, { color: theme.textSecondary }]}>
                Tải file video từ máy tính của bạn hoặc chọn nhanh video mẫu có sẵn:
              </Text>

              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[styles.uploadPCBtn, { backgroundColor: theme.primary }]}
                  onPress={() => fileInputRef.current?.click()}
                  disabled={uploadingLocal}
                  activeOpacity={0.85}
                >
                  {uploadingLocal ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.uploadPCText}>
                        Chọn file .MP4 từ máy tính
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <Text style={[styles.sampleHeader, { color: theme.textMuted }]}>
                Hoặc chọn nhanh kho Video mẫu HD:
              </Text>
              <View style={styles.sampleList}>
                {SAMPLE_UPLOAD_VIDEOS.map((s) => {
                  const selected = videoUrl === s.videoUrl;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.sampleChip,
                        {
                          backgroundColor: selected
                            ? theme.primaryLight
                            : theme.surfaceVariant,
                          borderColor: selected ? theme.primary : 'transparent',
                        },
                      ]}
                      onPress={() => handleSelectSample(s)}
                    >
                      <Image
                        source={{ uri: s.thumbnailUrl }}
                        style={styles.sampleChipThumb}
                      />
                      <Text
                        style={[
                          styles.sampleChipLabel,
                          { color: selected ? theme.primary : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* 3. Form thông tin Video */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Tiêu đề video *
            </Text>
            <TextInput
              style={[
                styles.singleInput,
                { backgroundColor: theme.surfaceVariant, color: theme.text },
              ]}
              placeholder="Nhập tiêu đề hấp dẫn cho video..."
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Mô tả nội dung
            </Text>
            <TextInput
              style={[
                styles.textAreaInput,
                { backgroundColor: theme.surfaceVariant, color: theme.text },
              ]}
              placeholder="Kể câu chuyện đằng sau video này..."
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Chủ đề */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Danh mục chủ đề
            </Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active
                          ? theme.primary
                          : theme.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: active ? '#FFFFFF' : theme.textSecondary,
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Hashtags */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Thẻ Hashtag (#)
            </Text>
            <View style={styles.tagChipsWrap}>
              {hashtags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: theme.primaryLight }]}
                >
                  <Text style={[styles.tagChipText, { color: theme.primary }]}>
                    #{tag}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveHashtag(tag)}
                    style={styles.tagRemoveBtn}
                  >
                    <Ionicons name="close" size={14} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.addTagRow}>
              <TextInput
                style={[
                  styles.addTagInput,
                  { backgroundColor: theme.surfaceVariant, color: theme.text },
                ]}
                placeholder="Thêm hashtag mới (VD: xuhuong)..."
                placeholderTextColor={theme.textMuted}
                value={newTagInput}
                onChangeText={setNewTagInput}
                onSubmitEditing={handleAddHashtag}
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddHashtag}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.settingRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Cho phép người xem bình luận & đánh giá sao
            </Text>
            <Switch
              value={commentsEnabled}
              onValueChange={setCommentsEnabled}
              trackColor={{ false: '#CBD5E1', true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 4. Nút Lưu nháp & Đăng tải lên MongoDB */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.draftButton, { borderColor: theme.primary }]}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bookmark-outline"
              size={18}
              color={theme.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.draftButtonText, { color: theme.primary }]}>
              Lưu nháp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.publishButton}
            onPress={handlePublish}
            disabled={publishing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.publishGradient}
            >
              {publishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.publishButtonText}>
                    Đăng tải lên hệ thống
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 44,
  },
  previewCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 14,
  },
  videoPreviewBox: {
    width: 130,
    height: 210,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  realBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  realBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  sourcePickCol: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  sourceSub: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  uploadPCBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadPCText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sampleHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  sampleList: {
    gap: 6,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sampleChipThumb: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  sampleChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  singleInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textAreaInput: {
    height: 80,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagRemoveBtn: {
    padding: 2,
  },
  addTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTagInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  draftButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  publishButton: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  publishGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
