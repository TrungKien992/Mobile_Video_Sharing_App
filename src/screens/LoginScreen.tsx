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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  getErrorMessage,
  validateEmail,
  validatePassword,
} from '../utils/validators';
import { login } from '../services/authService';
import { showMessage } from '../utils/dialog';

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { signIn, navigateTo, goBack, setTab, activeRoute } = useApp();

  const [email, setEmail] = useState('demo@vclip.vn');
  const [password, setPassword] = useState('123456');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    setErrors({ email: emailErr, password: passErr });
    return !emailErr && !passErr;
  };

  const handleLogin = async (customEmail?: string, customPass?: string) => {
    const targetEmail = customEmail !== undefined ? customEmail : email;
    const targetPass = customPass !== undefined ? customPass : password;

    if (customEmail === undefined && !validate()) return;

    setLoading(true);
    setServerError(null);
    try {
      const res = await login({ email: targetEmail, password: targetPass });
      await signIn(res.user, res.token);
      showMessage('Thành công', `Chào mừng ${res.user.displayName} quay trở lại!`);
      if (activeRoute.name === 'login' && activeRoute.redirectTo) {
        navigateTo(activeRoute.redirectTo);
      } else {
        setTab('profile');
      }
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
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>Đăng nhập tài khoản</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <LinearGradient
            colors={theme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="play" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Chào mừng đến với VClip
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>
            Đăng nhập để đăng tải video, thả tim, bình luận và đồng bộ dữ liệu trên MongoDB
          </Text>
        </View>

        {/* Card Form */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {serverError && (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.errorBannerText, { color: theme.danger }]}>
                {serverError}
              </Text>
            </View>
          )}

          <FormField
            label="Địa chỉ Email"
            icon="mail"
            placeholder="Nhập email (VD: demo@vclip.vn)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
            error={errors.email}
          />

          <FormField
            label="Mật khẩu"
            icon="lock"
            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
            isPassword
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
            }}
            error={errors.password}
          />

          <PrimaryButton
            title="Đăng nhập"
            onPress={() => handleLogin()}
            loading={loading}
            style={{ marginTop: 6 }}
          />

          {/* Quick Demo Accounts */}
          <View style={[styles.demoBox, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.demoTitle, { color: theme.textSecondary }]}>
              ⚡ Tài khoản Demo có sẵn trong MongoDB:
            </Text>
            <View style={styles.demoBtnRow}>
              <TouchableOpacity
                style={[styles.demoChip, { borderColor: theme.primary }]}
                onPress={() => {
                  setEmail('demo@vclip.vn');
                  setPassword('123456');
                  handleLogin('demo@vclip.vn', '123456');
                }}
              >
                <Text style={[styles.demoChipText, { color: theme.primary }]}>
                  demo@vclip.vn (Minh Khôi)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoChip, { borderColor: theme.accent }]}
                onPress={() => {
                  setEmail('demo@bookstore.vn');
                  setPassword('123456');
                  handleLogin('demo@bookstore.vn', '123456');
                }}
              >
                <Text style={[styles.demoChipText, { color: theme.accent }]}>
                  demo@bookstore.vn (Thu Hoài)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Chưa có tài khoản?
            </Text>
            <TouchableOpacity onPress={() => navigateTo({ name: 'register' })}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>
                {' '}
                Đăng ký ngay
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
  brandBox: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
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
  demoBox: {
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  demoBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '700',
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
