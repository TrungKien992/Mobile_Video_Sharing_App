import React, { useRef, useState } from 'react';
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
import { showMessage } from '../utils/dialog';

export const CreateVideoScreen: React.FC = () => {
  const { navigateTo, setTab } = useApp();

  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const currentSample = SAMPLE_UPLOAD_VIDEOS[selectedSampleIdx] || SAMPLE_UPLOAD_VIDEOS[0];

  const [selectedMusic, setSelectedMusic] = useState<MusicItem>(INITIAL_MUSICS[0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterItem>(INITIAL_FILTERS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [timerSetting, setTimerSetting] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      navigateTo({
        name: 'create_post',
        draftVideoUri: uploaded.url,
      });
    } catch {
      // Nếu backend bận, dùng ObjectURL trực tiếp để vẫn phát được video thực
      const localBlobUrl = URL.createObjectURL(file);
      navigateTo({
        name: 'create_post',
        draftVideoUri: localBlobUrl,
      });
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
        navigateTo({
          name: 'create_post',
          draftVideoUri: asset.uri,
        });
      }
    } catch {
      navigateTo({
        name: 'create_post',
        draftVideoUri: currentSample.videoUrl,
      });
    }
  };

  // Quay video / Chuyển sang bước điền thông tin đăng tải
  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordTimer(0);
      const interval = setInterval(() => {
        setRecordTimer((t) => {
          if (t >= 5) {
            clearInterval(interval);
            setIsRecording(false);
            navigateTo({
              name: 'create_post',
              draftVideoUri: currentSample.videoUrl,
            });
            return 5;
          }
          return t + 1;
        });
      }, 1000);
    } else {
      setIsRecording(false);
      navigateTo({
        name: 'create_post',
        draftVideoUri: currentSample.videoUrl,
      });
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
          onPress={() =>
            navigateTo({
              name: 'create_post',
              draftVideoUri: currentSample.videoUrl,
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.nextStepText}>Tiếp tục →</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Thanh công cụ bên phải */}
      <View style={styles.rightToolbar}>
        <TouchableOpacity
          style={styles.toolItem}
          onPress={() =>
            setSelectedSampleIdx((prev) => (prev + 1) % SAMPLE_UPLOAD_VIDEOS.length)
          }
          activeOpacity={0.8}
        >
          <Ionicons name="sync-outline" size={24} color="#FFFFFF" />
          <Text style={styles.toolLabel}>Đổi cảnh</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => setFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="color-filter-outline" size={24} color="#FFFFFF" />
          <Text style={styles.toolLabel}>Bộ lọc</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => setTimerSetting((t) => (t === 3 ? 10 : t === 10 ? null : 3))}
          activeOpacity={0.8}
        >
          <Ionicons name="timer-outline" size={24} color="#FFFFFF" />
          <Text style={styles.toolLabel}>
            {timerSetting ? `${timerSetting}s` : 'Hẹn giờ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => setFlashOn((f) => !f)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off-outline'}
            size={24}
            color={flashOn ? '#FBBF24' : '#FFFFFF'}
          />
          <Text style={styles.toolLabel}>Đèn</Text>
        </TouchableOpacity>
      </View>

      {/* Thời gian đang quay */}
      {isRecording && (
        <View style={styles.recordingTimerBadge}>
          <View style={styles.redPulseDot} />
          <Text style={styles.timerText}>
            Đang ghi hình 00:0{recordTimer} / 00:05
          </Text>
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
    maxWidth: 180,
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
    width: 56,
  },
  toolLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
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
