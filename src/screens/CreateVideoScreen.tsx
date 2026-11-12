import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { FilterModal } from '../components/FilterModal';
import { MusicModal } from '../components/MusicModal';
import { FilterItem, MusicItem } from '../types';
import { INITIAL_FILTERS, getCssFilterForId } from '../data/initialFilters';
import { INITIAL_MUSICS, NO_MUSIC_ITEM } from '../data/initialMusics';
import { useApp } from '../context/AppContext';
import { uploadFile } from '../api/client';
import { showMessage, showToast } from '../utils/dialog';

export const CreateVideoScreen: React.FC = () => {
  const {
    navigateTo,
    goBack,
    setTab,
    createPresetMusicId,
    clearCreatePresetMusic,
  } = useApp();
  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === 'web' ? 18 : Math.max(18, insets.top + 8);
  const bottomOffset = Platform.OS === 'web' ? 28 : Math.max(24, insets.bottom + 14);

  const [selectedMusic, setSelectedMusic] = useState<MusicItem>(NO_MUSIC_ITEM);
  const [selectedFilter, setSelectedFilter] = useState<FilterItem>(INITIAL_FILTERS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [maxRecordDuration, setMaxRecordDuration] = useState<5 | 15 | 60>(15);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [timerSetting, setTimerSetting] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Trạng thái camera thực trên Web
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    Platform.OS === 'web' ? 'loading' : 'ready'
  );
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedFilterRef = useRef(selectedFilter);
  const selectedMusicRef = useRef(selectedMusic);

  useEffect(() => {
    selectedFilterRef.current = selectedFilter;
  }, [selectedFilter]);

  useEffect(() => {
    selectedMusicRef.current = selectedMusic;
  }, [selectedMusic]);

  // Tự động chọn nhạc nếu người dùng bấm "Dùng nhạc" từ video khác
  useEffect(() => {
    if (createPresetMusicId) {
      const found = INITIAL_MUSICS.find((m) => m.id === createPresetMusicId);
      if (found) {
        setSelectedMusic(found);
      }
      clearCreatePresetMusic();
    }
  }, [createPresetMusicId, clearCreatePresetMusic]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (webVideoRef.current) {
      webVideoRef.current.srcObject = null;
    }
  }, []);

  const initWebCamera = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraErrorMsg('Trình duyệt không hỗ trợ truy cập Camera trực tiếp.');
      return;
    }

    stopCameraStream();
    setCameraStatus('loading');
    setCameraErrorMsg('');

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
      } catch {
        // Thử lại chỉ bật video nếu máy không có micro
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (webVideoRef.current) {
        webVideoRef.current.srcObject = stream;
        webVideoRef.current.play().catch(() => {});
      }
      setCameraStatus('ready');
    } catch {
      setCameraStatus('unavailable');
      setCameraErrorMsg(
        'Chưa có quyền truy cập Camera hoặc thiết bị không có webcam. Hãy cấp quyền Camera hoặc chọn video từ máy.'
      );
    }
  }, [facingMode, stopCameraStream]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initWebCamera();
    }
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        } catch {}
      }
      stopCameraStream();
    };
  }, [initWebCamera, stopCameraStream]);

  const attachWebVideoRef = useCallback((el: HTMLVideoElement | null) => {
    webVideoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const goToPostScreen = useCallback(
    (videoUri: string) => {
      stopCameraStream();
      navigateTo({
        name: 'create_post',
        draftVideoUri: videoUri,
        selectedFilterId: selectedFilterRef.current.id,
        selectedMusicId: selectedMusicRef.current.id,
      });
    },
    [navigateTo, stopCameraStream]
  );

  // Xử lý chọn file video thực từ máy tính trên Web -> Upload lên Express Server (/api/upload)
  const handleWebFileChange = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploaded = await uploadFile(file);
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
        setUploadingFile(true);
        try {
          const uploaded = await uploadFile({
            uri: asset.uri,
            name: `video_${Date.now()}.mp4`,
            type: 'video/mp4',
          });
          goToPostScreen(uploaded.url);
        } catch {
          goToPostScreen(asset.uri);
        } finally {
          setUploadingFile(false);
        }
      }
    } catch {
      showMessage('Không thể mở thư viện', 'Vui lòng cấp quyền truy cập thư viện ảnh/video.');
    }
  };

  const stopWebRecording = useCallback(() => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const launchNativeCamera = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showMessage(
          'Cần quyền Camera',
          'Vui lòng cấp quyền Camera để quay video trực tiếp.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: maxRecordDuration,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingFile(true);
        try {
          const uploaded = await uploadFile({
            uri: asset.uri,
            name: `camera_${Date.now()}.mp4`,
            type: 'video/mp4',
          });
          goToPostScreen(uploaded.url);
        } catch {
          goToPostScreen(asset.uri);
        } finally {
          setUploadingFile(false);
        }
      }
    } catch {
      showMessage('Lỗi Camera', 'Không thể mở camera trên thiết bị này.');
    }
  }, [goToPostScreen, maxRecordDuration]);

  const startRecordingNow = useCallback(() => {
    if (Platform.OS !== 'web') {
      launchNativeCamera();
      return;
    }

    if (!streamRef.current || cameraStatus !== 'ready') {
      showMessage(
        'Chưa có Camera',
        'Vui lòng bật/cấp quyền Camera hoặc chọn video có sẵn từ thiết bị.'
      );
      return;
    }

    recordedChunksRef.current = [];
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    const supportedType =
      typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
        ? candidates.find((t) => MediaRecorder.isTypeSupported(t))
        : undefined;

    try {
      const recorder = supportedType
        ? new MediaRecorder(streamRef.current, { mimeType: supportedType })
        : new MediaRecorder(streamRef.current);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length === 0) return;
        const mimeType = recorder.mimeType || supportedType || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });

        setUploadingFile(true);
        try {
          const file = new File([blob], `recorded_${Date.now()}.${ext}`, {
            type: mimeType,
          });
          const uploaded = await uploadFile(file);
          goToPostScreen(uploaded.url);
        } catch {
          const localBlobUrl = URL.createObjectURL(blob);
          goToPostScreen(localBlobUrl);
        } finally {
          setUploadingFile(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordTimer(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordTimer((t) => {
          if (t + 1 >= maxRecordDuration) {
            stopWebRecording();
            return maxRecordDuration;
          }
          return t + 1;
        });
      }, 1000);
    } catch {
      showMessage(
        'Không thể quay video',
        'Trình duyệt không hỗ trợ MediaRecorder cho Camera hiện tại.'
      );
    }
  }, [cameraStatus, goToPostScreen, launchNativeCamera, maxRecordDuration, stopWebRecording]);

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
      stopWebRecording();
    }
  };

  return (
    <View style={styles.container}>
      {/* Input ẩn cho Web để chọn file video từ máy tính */}
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

      {/* 1. Vùng Camera Viewfinder thực (bộ lọc chỉ áp dụng trực tiếp vào video, không phủ toàn UI) */}
      <View style={styles.cameraLayer}>
        {Platform.OS === 'web' ? (
          cameraStatus === 'ready' ? (
            React.createElement('video', {
              ref: attachWebVideoRef,
              autoPlay: true,
              muted: true,
              playsInline: true,
              style: {
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                filter: getCssFilterForId(selectedFilter.id),
              },
            })
          ) : (
            <View style={styles.cameraFallbackBox}>
              {cameraStatus === 'loading' ? (
                <>
                  <ActivityIndicator size="large" color="#FF3366" />
                  <Text style={styles.cameraFallbackTitle}>Đang mở Camera...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="videocam-off-outline" size={48} color="#94A3B8" />
                  <Text style={styles.cameraFallbackTitle}>Chưa kết nối được Camera</Text>
                  <Text style={styles.cameraFallbackSub}>{cameraErrorMsg}</Text>
                  <View style={styles.fallbackActionRow}>
                    <TouchableOpacity
                      style={styles.retryCameraBtn}
                      onPress={initWebCamera}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="refresh" size={16} color="#FFFFFF" />
                      <Text style={styles.retryCameraText}>Thử bật lại Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickVideoFallbackBtn}
                      onPress={handlePickFromGallery}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.retryCameraText}>Chọn video từ máy</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )
        ) : (
          <View style={styles.cameraFallbackBox}>
            <Ionicons name="videocam-outline" size={54} color="#FFFFFF" />
            <Text style={styles.cameraFallbackTitle}>Sẵn sàng quay video của bạn</Text>
            <Text style={styles.cameraFallbackSub}>
              Nhấn nút quay màu đỏ bên dưới để mở Camera ghi hình, hoặc tải video có sẵn từ thư viện.
            </Text>
          </View>
        )}
      </View>

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

      {/* Overlay đang xử lý video sau khi quay/chọn */}
      {uploadingFile && (
        <View style={styles.countdownOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.countdownLabel}>Đang chuẩn bị video của bạn...</Text>
        </View>
      )}

      {/* 2. Top bar: Nút đóng & Chọn âm thanh */}
      <View style={[styles.topBar, { top: topOffset }]}>
        <TouchableOpacity
          style={styles.circleIconBtn}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={() => {
            stopCameraStream();
            goBack();
          }}
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
            {selectedMusic.id === NO_MUSIC_ITEM.id ? 'Thêm âm thanh' : selectedMusic.title}
          </Text>
        </TouchableOpacity>

        <View style={{ width: 38 }} />
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
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={styles.toolItem}
            onPress={() => {
              setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            <Text style={styles.toolLabel}>Lật cam</Text>
          </TouchableOpacity>
        )}

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
        <View style={[styles.durationSelectorRow, { bottom: bottomOffset + 90 }]}>
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

      {/* 4. Bộ điều khiển dưới cùng: Bộ lọc, Nút quay, Tải video từ máy */}
      <View style={[styles.bottomControls, { bottom: bottomOffset }]}>
        <TouchableOpacity
          style={styles.controlSideBtn}
          onPress={() => setFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.sideIconWrap}>
            <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.controlSideLabel}>Bộ lọc</Text>
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
          <Text style={styles.controlSideLabel}>Tải video</Text>
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
  cameraLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#090D16',
  },
  cameraFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  cameraFallbackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  cameraFallbackSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  fallbackActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3366',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  pickVideoFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5B4BFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  retryCameraText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    maxWidth: 195,
  },
  addAudioText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
