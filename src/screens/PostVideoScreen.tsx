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
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../services/storageService';
import { SAMPLE_UPLOAD_VIDEOS } from '../data/initialVideos';
import { INITIAL_FILTERS } from '../data/initialFilters';
import { INITIAL_MUSICS } from '../data/initialMusics';
import { VideoPlayer } from '../components/VideoPlayer';
import { FilterModal } from '../components/FilterModal';
import { MusicModal } from '../components/MusicModal';
import { uploadFile, generateAICaption } from '../api/client';
import { showMessage, showToast } from '../utils/dialog';
import { FilterItem, MusicItem, VideoDraft } from '../types';

interface PostVideoScreenProps {
  draftVideoUri?: string;
  selectedFilterId?: string;
  selectedMusicId?: string;
}

const CATEGORIES = [
  'Thú cưng',
  'Thể thao',
  'Thiên nhiên',
  'Ẩm thực',
  'Giải trí',
  'Đời sống',
];

export const PostVideoScreen: React.FC<PostVideoScreenProps> = ({
  draftVideoUri,
  selectedFilterId,
  selectedMusicId,
}) => {
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
  const [selectedFilter, setSelectedFilter] = useState<FilterItem>(
    () => INITIAL_FILTERS.find((f) => f.id === selectedFilterId) || INITIAL_FILTERS[0]
  );
  const [selectedMusic, setSelectedMusic] = useState<MusicItem>(
    () => INITIAL_MUSICS.find((m) => m.id === selectedMusicId) || INITIAL_MUSICS[0]
  );
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  const [title, setTitle] = useState<string>('Khoảnh khắc thú vị hôm nay ✨');
  const [description, setDescription] = useState<string>(
    'Video quay thực tế độ phân giải HD chia sẻ lên cộng đồng VClip!'
  );
  const [category, setCategory] = useState<string>('Thú cưng');
  const [hashtags, setHashtags] = useState<string[]>(['vclip', 'xuhuong', 'videohd']);
  const [newTagInput, setNewTagInput] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [videoDuration, setVideoDuration] = useState<string>('00:18');
  const [publishing, setPublishing] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<VideoDraft[]>([]);

  // Trạng thái Google AI Caption & Hashtag Generator
  const [aiStyle, setAiStyle] = useState<'viral' | 'funny' | 'chill' | 'review'>('viral');
  const [aiTopicPrompt, setAiTopicPrompt] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiSourceLabel, setAiSourceLabel] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

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
      if (!title.trim() || title === 'Khoảnh khắc thú vị hôm nay ✨') {
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

  const handleWebCoverUpload = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const res = await uploadFile(file);
      setCoverPhotoUri(res.url);
      showToast('Đã cập nhật ảnh bìa mới 🖼️', 'success');
    } catch {
      const localUrl = URL.createObjectURL(file);
      setCoverPhotoUri(localUrl);
      showToast('Đã chọn ảnh bìa từ máy tính 🖼️', 'info');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePickCoverPhoto = async () => {
    if (Platform.OS === 'web') {
      coverInputRef.current?.click();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setUploadingCover(true);
        try {
          const uploaded = await uploadFile({
            uri: asset.uri,
            name: `cover_${Date.now()}.jpg`,
            type: 'image/jpeg',
          });
          setCoverPhotoUri(uploaded.url);
        } catch {
          setCoverPhotoUri(asset.uri);
        } finally {
          setUploadingCover(false);
        }
        showToast('Đã cập nhật ảnh bìa video 🖼️', 'success');
      }
    } catch {}
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

  const handleGenerateByGoogleAI = async () => {
    setAiGenerating(true);
    try {
      const topicSeed =
        aiTopicPrompt.trim() ||
        (title !== 'Khoảnh khắc thú vị hôm nay ✨' ? title : '') ||
        category;
      const result = await generateAICaption({
        topic: topicSeed,
        category,
        style: aiStyle,
      });
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (Array.isArray(result.hashtags) && result.hashtags.length > 0) {
        setHashtags(result.hashtags);
      }
      setAiSourceLabel(result.source || 'Google Free AI');
      showToast('✨ Đã tạo Tiêu đề, Mô tả & Hashtag bằng Google AI!', 'success');
    } catch {
      showToast('Không thể gọi AI lúc này, vui lòng thử lại', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    const updated = await StorageService.saveDraft({
      id: 'draft_' + Date.now(),
      title: title || 'Bản nháp chưa đặt tên',
      description,
      videoUri: videoUrl,
      coverUri: coverPhotoUri,
      hashtags,
      category,
      filter: selectedFilter.id,
      musicId: selectedMusic.id,
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
    showToast('Đã lưu bản nháp (kèm bộ lọc & nhạc) vào bộ nhớ 📂', 'success');
  };

  const handleLoadDraft = (draft: VideoDraft) => {
    setTitle(draft.title);
    setDescription(draft.description);
    if (draft.videoUri) setVideoUrl(draft.videoUri);
    if (draft.coverUri) setCoverPhotoUri(draft.coverUri);
    if (draft.hashtags?.length) setHashtags(draft.hashtags);
    if (draft.category) setCategory(draft.category);
    if (draft.filter) {
      const f = INITIAL_FILTERS.find((item) => item.id === draft.filter);
      if (f) setSelectedFilter(f);
    }
    if (draft.musicId) {
      const m = INITIAL_MUSICS.find((item) => item.id === draft.musicId);
      if (m) setSelectedMusic(m);
    }
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
        filter: selectedFilter.id,
        music: selectedMusic,
        commentsEnabled,
        duration: videoDuration || '00:18',
      });

      showMessage(
        'Đăng video thành công! 🎉',
        `Video "${created.title}" (Bộ lọc: ${selectedFilter.nameVi}, Nhạc: ${selectedMusic.title}) đã được lưu vào MongoDB!`
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
        <>
          {/* @ts-ignore */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/*"
            style={{ display: 'none' }}
            onChange={handleWebFileUpload}
          />
          {/* @ts-ignore */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleWebCoverUpload}
          />
        </>
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

        {/* 2. Xem trước Video thực + Chọn nguồn Video & Ảnh bìa */}
        <View
          style={[
            styles.previewCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.previewRow}>
            <View style={styles.videoPreviewCol}>
              <View style={styles.videoPreviewBox}>
                <VideoPlayer
                  videoUrl={videoUrl}
                  thumbnailUrl={coverPhotoUri}
                  isPlaying={true}
                  isLooping={true}
                  showControls={false}
                  filterOverlayColor={selectedFilter.overlayColor}
                  onDurationDetected={(formatted) => {
                    if (formatted && formatted !== '00:00') {
                      setVideoDuration(formatted);
                    }
                  }}
                />
                <View style={styles.realBadge}>
                  <Text style={styles.realBadgeText}>
                    LIVE • {videoDuration}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.changeCoverBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={handlePickCoverPhoto}
                disabled={uploadingCover}
                activeOpacity={0.8}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={14} color={theme.primary} />
                    <Text style={[styles.changeCoverText, { color: theme.primary }]}>
                      Đổi ảnh bìa
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.sourcePickCol}>
              <Text style={[styles.sourceTitle, { color: theme.text }]}>
                Nguồn Video (.MP4 thực)
              </Text>
              <Text style={[styles.sourceSub, { color: theme.textSecondary }]}>
                Tải file video từ máy hoặc chọn nhanh video mẫu:
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

          {/* Thanh chọn nhanh Bộ lọc màu & Nhạc nền ngay tại bước Đăng */}
          <View style={[styles.mediaMetaRow, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.metaPickerPill, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => setFilterModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="color-filter-outline" size={16} color={theme.primary} />
              <Text
                style={[styles.metaPickerText, { color: theme.text }]}
                numberOfLines={1}
              >
                Bộ lọc: {selectedFilter.nameVi}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metaPickerPill, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => setMusicModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="musical-notes-outline" size={16} color="#FF2A6D" />
              <Text
                style={[styles.metaPickerText, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedMusic.title}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Form thông tin Video */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Khung Trợ lý Google AI tạo Caption & Hashtag tự động */}
          <View
            style={[
              styles.aiAssistantCard,
              {
                backgroundColor: theme.primaryLight,
                borderColor: theme.primary,
              },
            ]}
          >
            <View style={styles.aiHeaderRow}>
              <View style={styles.aiTitleLeft}>
                <LinearGradient
                  colors={['#5B4BFF', '#EC4899']}
                  style={styles.aiSparkleBadge}
                >
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.aiCardTitle, { color: theme.text }]}>
                    Trợ lý Google AI viết Caption & Hashtag
                  </Text>
                  <Text style={[styles.aiCardSub, { color: theme.textSecondary }]}>
                    {aiSourceLabel
                      ? `Nguồn: ${aiSourceLabel}`
                      : 'Tích hợp qua Backend Proxy (.env)'}
                  </Text>
                </View>
              </View>
            </View>

            <TextInput
              style={[
                styles.aiPromptInput,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Nhập ý tưởng ngắn (VD: Cún cưng chạy chơi ngoài công viên buổi sáng)..."
              placeholderTextColor={theme.textMuted}
              value={aiTopicPrompt}
              onChangeText={setAiTopicPrompt}
            />

            <View style={styles.aiStyleRow}>
              {(
                [
                  { id: 'viral', label: '🔥 Xu hướng' },
                  { id: 'funny', label: '😂 Hài hước' },
                  { id: 'chill', label: '🌿 Chữa lành' },
                  { id: 'review', label: '📌 Review' },
                ] as const
              ).map((st) => {
                const active = aiStyle === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.aiStyleChip,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                      },
                    ]}
                    onPress={() => setAiStyle(st.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.aiStyleChipText,
                        { color: active ? '#FFFFFF' : theme.textSecondary },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleGenerateByGoogleAI}
              disabled={aiGenerating}
              activeOpacity={0.85}
              style={styles.aiGenerateBtnWrap}
            >
              <LinearGradient
                colors={['#5B4BFF', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiGenerateBtnGradient}
              >
                {aiGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.aiGenerateBtnText}>
                      Google AI đang sáng tạo nội dung...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.aiGenerateBtnText}>
                      ✨ Gợi ý Tiêu đề, Mô tả & Hashtag bằng Google AI
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

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

      <FilterModal
        visible={filterModalOpen}
        selectedFilterId={selectedFilter.id}
        onSelectFilter={(filter) => {
          setSelectedFilter(filter);
          setFilterModalOpen(false);
        }}
        onClose={() => setFilterModalOpen(false)}
      />

      <MusicModal
        visible={musicModalOpen}
        selectedMusicId={selectedMusic.id}
        onSelectMusic={(music) => {
          setSelectedMusic(music);
          setMusicModalOpen(false);
        }}
        onClose={() => setMusicModalOpen(false)}
      />
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
  videoPreviewCol: {
    width: 130,
    alignItems: 'center',
    gap: 8,
  },
  videoPreviewBox: {
    width: 130,
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  changeCoverBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeCoverText: {
    fontSize: 11,
    fontWeight: '700',
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
  mediaMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metaPickerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  metaPickerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  aiAssistantCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  aiSparkleBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  aiCardSub: {
    fontSize: 10,
    marginTop: 1,
  },
  aiKeyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiKeyToggleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  apiKeyInputWrap: {
    marginBottom: 8,
  },
  apiKeyInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 11,
  },
  aiPromptInput: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 8,
  },
  aiStyleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  aiStyleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  aiStyleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aiGenerateBtnWrap: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  aiGenerateBtnGradient: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiGenerateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
