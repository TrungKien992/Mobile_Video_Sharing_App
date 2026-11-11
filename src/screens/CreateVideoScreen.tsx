import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { FilterModal } from '../components/FilterModal';
import { MusicModal } from '../components/MusicModal';
import { VideoPlayer } from '../components/VideoPlayer';
import { FilterItem, MusicItem } from '../types';
import { INITIAL_FILTERS } from '../data/initialFilters';
import { INITIAL_MUSICS } from '../data/initialMusics';
import { SAMPLE_UPLOAD_VIDEOS } from '../data/initialVideos';
import { useApp } from '../context/AppContext';
import { uploadFile } from '../api/client';
import { showMessage, showToast } from '../utils/dialog';

export const CreateVideoScreen: React.FC = () => {
  const {
    navigateTo,
    setTab,
    createPresetMusicId,
    clearCreatePresetMusic,
  } = useApp();

  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const currentSample = SAMPLE_UPLOAD_VIDEOS[selectedSampleIdx] || SAMPLE_UPLOAD_VIDEOS[0];

  const [selectedMusic, setSelectedMusic] = useState<MusicItem>(INITIAL_MUSICS[0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterItem>(INITIAL_FILTERS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [maxRecordDuration, setMaxRecordDuration] = useState<5 | 15 | 60>(15);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [timerSetting, setTimerSetting] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tự động chọn nhạc nếu người dùng bấm "Dùng nhạc này" từ Trang chủ hoặc Màn hình xem video
  useEffect(() => {
    if (createPresetMusicId) {
      const found = INITIAL_MUSICS.find((m) => m.id === createPresetMusicId);
      if (found) {
        setSelectedMusic(found);
      }
      clearCreatePresetMusic();
    }
  }, [createPresetMusicId, clearCreatePresetMusic]);

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const goToPostScreen = (videoUri: string) => {
    navigateTo({
      name: 'create_post',
      draftVideoUri: videoUri,
      selectedFilterId: selectedFilter.id,
      selectedMusicId: selectedMusic.id,
    });
  };

  // Xử lý chọn file video thực từ máy tính trên Web -> Upload lên Express Server (/api/upload)
  const handleWebFileChange = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploaded = await uploadFile(file);
      showMessage(
        'Tải file thành công ✅',
        `Đã tải video "${file.name}" lên máy chủ Backend!`
      );
      goToPostScreen(uploaded.url);
    } catch {
      const localBlobUrl = URL.createObjectURL(file);
      goToPostScreen(localBlobUrl);
    } finally {
      setUploadingFile(false);
    }
  };

  // Chọn video từ thư viện máy
  const handlePickFromGallery = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        goToPostScreen(asset.uri);
      }
    } catch {
      goToPostScreen(currentSample.videoUrl);
    }
  };

  const startRecordingNow = () => {
    setIsRecording(true);
    setRecordTimer(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordTimer((t) => {
        if (t >= maxRecordDuration) {
          if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
          setIsRecording(false);
          goToPostScreen(currentSample.videoUrl);
          return maxRecordDuration;
        }
        return t + 1;
      });
    }, 1000);
  };

  // Quay video (hỗ trợ đếm ngược 3s / 10s nếu bật Hẹn giờ)
  const handleToggleRecord = () => {
    if (countdownLeft !== null) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setCountdownLeft(null);
      return;
    }

    if (!isRecording) {
      if (timerSetting && timerSetting > 0) {
        setCountdownLeft(timerSetting);
        countdownIntervalRef.current = setInterval(() => {
          setCountdownLeft((prev) => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              startRecordingNow();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        startRecordingNow();
      }
    } else {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      goToPostScreen(currentSample.videoUrl);
    }
  };

  return (
    <View style={styles.container}>
      {/* Input ẩn cho Web để chọn file .mp4 thực từ máy tính */}
      {Platform.OS === 'web' && (
        // @ts-ignore
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/*"
          style={{ display: 'none' }}
          onChange={handleWebFileChange}
        />
      )}

      {/* 1. Phát Video Thực làm Camera Viewfinder */}
      <VideoPlayer
        videoUrl={currentSample.videoUrl}
        thumbnailUrl={currentSample.thumbnailUrl}
        isPlaying={true}
        isLooping={true}
        showControls={false}
        filterOverlayColor={selectedFilter.overlayColor}
      />

      {/* Hiệu ứng Đèn trợ sáng (Flash / Ring Light) khi bật Flash */}
      {flashOn && <View pointerEvents="none" style={styles.flashRingOverlay} />}

      {/* Đồng hồ đếm ngược Hẹn giờ (3s / 10s) trước khi quay */}
      {countdownLeft !== null && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNumber}>{countdownLeft}</Text>
          </View>
          <Text style={styles.countdownLabel}>Chuẩn bị ghi hình...</Text>
        </View>
      )}

      {/* 2. Top bar: Nút đóng, Chọn âm thanh & Nút Tiếp tục */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleIconBtn}
          onPress={() => setTab('home')}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addAudioPill}
          onPress={() => setMusicModalOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="musical-notes"
            size={14}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.addAudioText} numberOfLines={1}>
            {selectedMusic ? selectedMusic.title : 'Thêm âm thanh'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextStepBtn}
          onPress={() => goToPostScreen(currentSample.videoUrl)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextStepText}>Tiếp tục →</Text>
        </TouchableOpacity>
      </View>

      {/* Badge hiển thị bộ lọc đang áp dụng */}
      {selectedFilter.id !== 'none' && (
        <View style={styles.activeFilterPill}>
          <Ionicons name="color-filter" size={12} color="#FBBF24" />
          <Text style={styles.activeFilterText}>Bộ lọc: {selectedFilter.nameVi}</Text>
        </View>
      )}

      {/* 3. Thanh công cụ bên phải */}
      <View style={styles.rightToolbar}>
        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => {
            setSelectedSampleIdx((prev) => (prev + 1) % SAMPLE_UPLOAD_VIDEOS.length);
            showToast('Đã chuyển cảnh quay mẫu 🎥', 'info');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="sync-outline" size={24} color="#FFFFFF" />
          <Text style={styles.toolLabel}>Đổi cảnh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolItem,
            selectedFilter.id !== 'none' && { borderColor: '#FF2A6D', borderWidth: 1.5 },
          ]}
          onPress={() => setFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="color-filter-outline"
            size={24}
            color={selectedFilter.id !== 'none' ? '#FF2A6D' : '#FFFFFF'}
          />
          <Text style={styles.toolLabel}>{selectedFilter.nameVi}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolItem,
            timerSetting !== null && { borderColor: '#38BDF8', borderWidth: 1.5 },
          ]}
          onPress={() => {
            const next = timerSetting === 3 ? 10 : timerSetting === 10 ? null : 3;
            setTimerSetting(next);
            showToast(
              next ? `Đã bật hẹn giờ đếm ngược ${next} giây ⏱` : 'Đã tắt hẹn giờ',
              'info'
            );
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="timer-outline"
            size={24}
            color={timerSetting ? '#38BDF8' : '#FFFFFF'}
          />
          <Text style={styles.toolLabel}>
            {timerSetting ? `${timerSetting}s` : 'Hẹn giờ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolItem,
            flashOn && { borderColor: '#FBBF24', borderWidth: 1.5 },
          ]}
          onPress={() => {
            setFlashOn((f) => {
              const next = !f;
              showToast(next ? 'Đã bật đèn trợ sáng Flash ⚡' : 'Đã tắt đèn Flash', 'info');
              return next;
            });
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off-outline'}
            size={24}
            color={flashOn ? '#FBBF24' : '#FFFFFF'}
          />
          <Text style={styles.toolLabel}>{flashOn ? 'Bật đèn' : 'Đèn'}</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tiến trình thời gian ghi hình trên đỉnh màn hình */}
      {isRecording && (
        <View style={styles.recordingTopProgressTrack}>
          <View
            style={[
              styles.recordingTopProgressFill,
              { width: `${Math.min(100, (recordTimer / maxRecordDuration) * 100)}%` },
            ]}
          />
        </View>
      )}

      {/* Thời gian đang quay */}
      {isRecording && (
        <View style={styles.recordingTimerBadge}>
          <View style={styles.redPulseDot} />
          <Text style={styles.timerText}>
            Đang ghi hình 00:{recordTimer < 10 ? `0${recordTimer}` : recordTimer} / 00:
            {maxRecordDuration < 10 ? `0${maxRecordDuration}` : maxRecordDuration}
          </Text>
        </View>
      )}

      {/* Tùy chọn thời lượng quay (5s / 15s / 60s) */}
      {!isRecording && (
        <View style={styles.durationSelectorRow}>
          {([5, 15, 60] as const).map((sec) => {
            const active = maxRecordDuration === sec;
            return (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.durationOptionChip,
                  active && styles.durationOptionChipActive,
                ]}
                onPress={() => setMaxRecordDuration(sec)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    active && styles.durationOptionTextActive,
                  ]}
                >
                  {sec}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 4. Bộ điều khiển dưới cùng: Hiệu ứng, Nút quay, Tải file MP4 từ máy */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.controlSideBtn}
          onPress={() => setFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.sideIconWrap}>
            <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlSideLabel}>Hiệu ứng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recordButtonOuter}
          onPress={handleToggleRecord}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.recordButtonInner,
              isRecording && styles.recordButtonActive,
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlSideBtn}
          onPress={handlePickFromGallery}
          disabled={uploadingFile}
          activeOpacity={0.8}
        >
          <View style={[styles.sideIconWrap, { backgroundColor: '#5B4BFF' }]}>
            {uploadingFile ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.controlSideLabel}>Tải file MP4</Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#000000',
    position: 'relative',
  },
  flashRingOverlay: {
    ...StyleSheet.absoluteFill,
    borderWidth: 14,
    borderColor: 'rgba(255, 251, 235, 0.85)',
    backgroundColor: 'rgba(255, 250, 220, 0.14)',
    zIndex: 12,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 13, 22, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 35,
  },
  countdownCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 51, 102, 0.9)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
  },
  countdownLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 185,
  },
  addAudioText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  nextStepBtn: {
    backgroundColor: '#5B4BFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  nextStepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  activeFilterPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 92 : 68,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  activeFilterText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  rightToolbar: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 110 : 85,
    alignItems: 'center',
    gap: 18,
    zIndex: 20,
  },
  toolItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 8,
    borderRadius: 14,
    width: 60,
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  recordingTopProgressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 40,
  },
  recordingTopProgressFill: {
    height: '100%',
    backgroundColor: '#FF3366',
  },
  recordingTimerBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 95 : 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 25,
  },
  durationSelectorRow: {
    position: 'absolute',
    bottom: 118,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 18,
    padding: 3,
    gap: 4,
    zIndex: 20,
  },
  durationOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  durationOptionChipActive: {
    backgroundColor: '#FFFFFF',
  },
  durationOptionText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },
  durationOptionTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  redPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 20,
  },
  controlSideBtn: {
    alignItems: 'center',
    width: 76,
  },
  sideIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  controlSideLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  recordButtonOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#FF3366',
  },
  recordButtonActive: {
    borderRadius: 10,
    width: '58%',
    height: '58%',
    backgroundColor: '#EF4444',
  },
});
