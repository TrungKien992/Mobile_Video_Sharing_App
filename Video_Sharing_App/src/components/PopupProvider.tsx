import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import {
  DialogConfig,
  registerPopupListeners,
  ToastConfig,
} from '../utils/dialog';

export const PopupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { theme } = useTheme();

  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unregister = registerPopupListeners(
      (newDialog) => {
        setDialog(newDialog);
        scaleAnim.setValue(0.85);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 75,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      },
      (newToast) => {
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
        setToast(newToast);
        toastY.setValue(-60);
        toastOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(toastY, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();

        toastTimerRef.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(toastY, {
              toValue: -60,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(toastOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => setToast(null));
        }, 2500);
      }
    );

    return () => {
      unregister();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [opacityAnim, scaleAnim, toastOpacity, toastY]);

  const handleCloseDialog = (confirmed: boolean) => {
    const current = dialog;
    setDialog(null);
    if (!current) return;
    if (confirmed) {
      current.onConfirm?.();
    } else {
      current.onCancel?.();
    }
  };

  const getDialogVisuals = () => {
    if (!dialog) {
      return {
        icon: 'information-circle' as const,
        colors: ['#5B4BFF', '#9333EA'] as [string, string],
        bgTint: 'rgba(91, 75, 255, 0.14)',
        iconColor: '#5B4BFF',
      };
    }
    switch (dialog.variant) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          colors: ['#10B981', '#059669'] as [string, string],
          bgTint: 'rgba(16, 185, 129, 0.15)',
          iconColor: '#10B981',
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          colors: ['#EF4444', '#DC2626'] as [string, string],
          bgTint: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          colors: ['#F59E0B', '#D97706'] as [string, string],
          bgTint: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#F59E0B',
        };
      case 'confirm':
        return {
          icon: 'help-circle' as const,
          colors: ['#FF3366', '#EC4899'] as [string, string],
          bgTint: 'rgba(255, 51, 102, 0.15)',
          iconColor: '#FF3366',
        };
      default:
        return {
          icon: 'sparkles' as const,
          colors: ['#5B4BFF', '#9333EA'] as [string, string],
          bgTint: 'rgba(91, 75, 255, 0.15)',
          iconColor: '#5B4BFF',
        };
    }
  };

  const getToastVisuals = () => {
    if (!toast) {
      return { icon: 'checkmark-circle' as const, color: '#10B981' };
    }
    switch (toast.variant) {
      case 'heart':
        return { icon: 'heart' as const, color: '#FF3366' };
      case 'bookmark':
        return { icon: 'bookmark' as const, color: '#F59E0B' };
      case 'error':
        return { icon: 'alert-circle' as const, color: '#EF4444' };
      case 'info':
        return { icon: 'information-circle' as const, color: '#38BDF8' };
      default:
        return { icon: 'checkmark-circle' as const, color: '#10B981' };
    }
  };

  const visuals = getDialogVisuals();
  const toastVisuals = getToastVisuals();

  return (
    <View style={styles.root}>
      {children}

      {/* 1. Floating Toast Notification (Góc trên màn hình) */}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrapper,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
            },
          ]}
        >
          <View style={styles.toastPill}>
            <View
              style={[
                styles.toastIconBadge,
                { backgroundColor: toastVisuals.color + '25' },
              ]}
            >
              <Ionicons
                name={toastVisuals.icon}
                size={18}
                color={toastVisuals.color}
              />
            </View>
            <Text style={styles.toastText} numberOfLines={2}>
              {toast.message}
            </Text>
            <TouchableOpacity
              onPress={() => setToast(null)}
              style={styles.toastCloseBtn}
            >
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* 2. Custom Center Popup Modal (Thay thế hoàn toàn window.alert & window.confirm) */}
      <Modal
        visible={!!dialog}
        transparent
        animationType="none"
        onRequestClose={() => handleCloseDialog(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (dialog?.mode === 'alert') {
                handleCloseDialog(true);
              } else {
                handleCloseDialog(false);
              }
            }}
          />

          {dialog && (
            <Animated.View
              style={[
                styles.dialogCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Dải màu trang trí trên đỉnh Popup */}
              <LinearGradient
                colors={visuals.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topAccentBar}
              />

              <View style={styles.dialogBody}>
                {/* Vòng tròn Icon trạng thái */}
                <View
                  style={[
                    styles.iconOuterRing,
                    { backgroundColor: visuals.bgTint },
                  ]}
                >
                  <LinearGradient
                    colors={visuals.colors}
                    style={styles.iconInnerCircle}
                  >
                    <Ionicons name={visuals.icon} size={30} color="#FFFFFF" />
                  </LinearGradient>
                </View>

                <Text style={[styles.dialogTitle, { color: theme.text }]}>
                  {dialog.title}
                </Text>

                <Text
                  style={[styles.dialogMessage, { color: theme.textSecondary }]}
                >
                  {dialog.message}
                </Text>

                {/* Hàng nút bấm */}
                {dialog.mode === 'confirm' ? (
                  <View style={styles.confirmBtnRow}>
                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        {
                          backgroundColor: theme.surfaceVariant,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => handleCloseDialog(false)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.cancelButtonText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {dialog.cancelText || 'Hủy bỏ'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmButtonWrap}
                      onPress={() => handleCloseDialog(true)}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={visuals.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.confirmButtonGradient}
                      >
                        <Text style={styles.confirmButtonText}>
                          {dialog.confirmText || 'Xác nhận'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.singleButtonWrap}
                    onPress={() => handleCloseDialog(true)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={visuals.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.singleButtonGradient}
                    >
                      <Text style={styles.confirmButtonText}>
                        {dialog.confirmText || 'Đã hiểu'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastWrapper: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    maxWidth: 380,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  toastIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  toastCloseBtn: {
    padding: 4,
    marginLeft: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  topAccentBar: {
    width: '100%',
    height: 6,
  },
  dialogBody: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
    alignItems: 'center',
  },
  iconOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  confirmButtonWrap: {
    flex: 1.2,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  singleButtonWrap: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  singleButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
