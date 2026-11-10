import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  getErrorMessage,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
} from '../utils/validators';
import { register } from '../services/authService';
import { showMessage } from '../utils/dialog';

export const RegisterScreen: React.FC = () => {
  const { theme } = useTheme();
  const { signIn, navigateTo, goBack, setTab } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nameErr = validateRequired(name, 'Họ và tên');
    const emailErr = validateEmail(email);
    const phoneErr = phone.trim() ? validatePhone(phone) : null;
    const passErr = validatePassword(password);
    const confirmErr =
      password !== confirmPassword ? 'Mật khẩu xác nhận không khớp' : null;

    setErrors({
      name: nameErr,
      email: emailErr,
      phone: phoneErr,
      password: passErr,
      confirmPassword: confirmErr,
    });

    return !nameErr && !emailErr && !phoneErr && !passErr && !confirmErr;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setServerError(null);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });
      await signIn(res.user, res.token);
      showMessage('Đăng ký thành công 🎉', `Tài khoản ${res.user.email} đã được tạo và lưu vào MongoDB!`);
      setTab('profile');
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>Đăng ký tài khoản</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.heading, { color: theme.text }]}>
            Tạo tài khoản VClip mới
          </Text>
          <Text style={[styles.subHeading, { color: theme.textSecondary }]}>
            Điền thông tin bên dưới để tham gia cộng đồng sáng tạo video ngắn
          </Text>

          {serverError && (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.errorBannerText, { color: theme.danger }]}>
                {serverError}
              </Text>
            </View>
          )}

          <FormField
            label="Họ và tên *"
            icon="user"
            placeholder="Ví dụ: Nguyễn Văn A"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors((p) => ({ ...p, name: null }));
            }}
            error={errors.name}
          />

          <FormField
            label="Địa chỉ Email *"
            icon="mail"
            placeholder="Ví dụ: nguyenvana@vclip.vn"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((p) => ({ ...p, email: null }));
            }}
            error={errors.email}
          />

          <FormField
            label="Số điện thoại (10 số bắt đầu bằng 0)"
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
            label="Mật khẩu *"
            icon="lock"
            placeholder="Tối thiểu 6 ký tự"
            isPassword
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((p) => ({ ...p, password: null }));
            }}
            error={errors.password}
          />

          <FormField
            label="Xác nhận mật khẩu *"
            icon="check-circle"
            placeholder="Nhập lại mật khẩu"
            isPassword
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (errors.confirmPassword)
                setErrors((p) => ({ ...p, confirmPassword: null }));
            }}
            error={errors.confirmPassword}
          />

          <PrimaryButton
            title="Hoàn tất đăng ký"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Đã có tài khoản?
            </Text>
            <TouchableOpacity onPress={() => navigateTo({ name: 'login' })}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>
                {' '}
                Đăng nhập
              </Text>
            </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
  },
});
