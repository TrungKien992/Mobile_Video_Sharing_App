import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { uploadFile } from '../api/client';
import {
  getErrorMessage,
  validatePhone,
  validateRequired,
} from '../utils/validators';
import { showMessage, showToast } from '../utils/dialog';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
];

export const EditProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const { currentUser, patchUser, goBack } = useApp();

  const [displayName, setDisplayName] = useState(
    currentUser.displayName || currentUser.name || ''
  );
  const [username, setUsername] = useState(currentUser.username || '');
  const [phone, setPhone] = useState(currentUser.phone || '0901234567');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [errors, setErrors] = useState<{
    displayName?: string | null;
    phone?: string | null;
  }>({});
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleWebAvatarFile = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const res = await uploadFile(file);
      setAvatarUrl(res.url);
      showToast('Đã tải ảnh đại diện mới lên Server 📸', 'success');
    } catch {
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      showToast('Đã chọn ảnh đại diện mới 📸', 'info');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickCustomAvatar = async () => {
    if (Platform.OS === 'web') {
      avatarInputRef.current?.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setUploadingAvatar(true);
        try {
          const uploaded = await uploadFile({
            uri: asset.uri,
            name: `avatar_${Date.now()}.jpg`,
            type: 'image/jpeg',
          });
          setAvatarUrl(uploaded.url);
        } catch {
          setAvatarUrl(asset.uri);
        } finally {
          setUploadingAvatar(false);
        }
        showToast('Đã cập nhật ảnh đại diện mới 📸', 'success');
      }
    } catch {}
  };

  const validate = () => {
    const nameErr = validateRequired(displayName, 'Họ và tên');
    const phoneErr = phone.trim() ? validatePhone(phone.trim()) : null;
    setErrors({ displayName: nameErr, phone: phoneErr });
    return !nameErr && !phoneErr;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await patchUser({
        displayName: displayName.trim(),
        name: displayName.trim(),
        username: username.trim().replace(/^@/, '') || currentUser.username,
        phone: phone.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      showMessage(
        'Đã lưu hồ sơ ✅',
        'Thông tin cá nhân đã được cập nhật vào MongoDB và giữ nguyên khi tải lại trang (F5).'
      );
      goBack();
    } catch (err) {
      showMessage('Lỗi', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {Platform.OS === 'web' && (
        // @ts-ignore
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebAvatarFile}
        />
      )}

      {/* Header */}
      <View
        style={[
          styles.topBar,
          { borderBottomColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>
          Chỉnh sửa hồ sơ cá nhân
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Avatar Section */}
          <View style={styles.avatarCenter}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickCustomAvatar}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.mainAvatar, { borderColor: theme.primary }]}
              />
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadAvatarBtn, { backgroundColor: theme.primaryLight }]}
              onPress={handlePickCustomAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={14} color={theme.primary} />
              <Text style={[styles.uploadAvatarText, { color: theme.primary }]}>
                Tải ảnh đại diện từ thiết bị
              </Text>
            </TouchableOpacity>

            <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>
              Hoặc chọn nhanh ảnh đại diện mẫu:
            </Text>
            <View style={styles.presetRow}>
              {AVATAR_PRESETS.map((uri) => {
                const selected = uri === avatarUrl;
                return (
                  <TouchableOpacity
                    key={uri}
                    onPress={() => setAvatarUrl(uri)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri }}
                      style={[
                        styles.presetThumb,
                        {
                          borderColor: selected ? theme.primary : 'transparent',
                          borderWidth: selected ? 2.5 : 0,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Email bị khóa (editable={false} theo BT9.4) */}
          <FormField
            label="Địa chỉ Email (Không thể thay đổi)"
            icon="mail"
            value={currentUser.email || 'demo@vclip.vn'}
            editable={false}
          />

          <FormField
            label="Họ và tên hiển thị *"
            icon="user"
            placeholder="Nhập họ và tên của bạn"
            value={displayName}
            onChangeText={(t) => {
              setDisplayName(t);
              if (errors.displayName)
                setErrors((p) => ({ ...p, displayName: null }));
            }}
            error={errors.displayName}
          />

          <FormField
            label="Id người dùng (@username)"
            icon="at-sign"
            placeholder="Ví dụ: minhkhoi.creator"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <FormField
            label="Số điện thoại (10 chữ số bắt đầu bằng 0)"
            icon="phone"
            placeholder="Ví dụ: 0901234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (errors.phone) setErrors((p) => ({ ...p, phone: null }));
            }}
            error={errors.phone}
          />

          <FormField
            label="Tiểu sử (Bio)"
            icon="edit-3"
            placeholder="Giới thiệu ngắn về kênh video của bạn..."
            value={bio}
            onChangeText={setBio}
            multiline
          />

          <View style={styles.btnRow}>
            <PrimaryButton
              title="Hủy"
              variant="outline"
              onPress={goBack}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="Lưu thay đổi"
              onPress={handleSave}
              loading={loading}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  avatarCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  mainAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },
  uploadAvatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  avatarHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
});
