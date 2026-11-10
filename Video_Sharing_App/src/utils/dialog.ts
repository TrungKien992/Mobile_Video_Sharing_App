export type PopupVariant = 'success' | 'error' | 'warning' | 'info' | 'confirm';
export type ToastVariant = 'success' | 'error' | 'info' | 'heart' | 'bookmark';

export interface DialogConfig {
  mode: 'alert' | 'confirm';
  variant: PopupVariant;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ToastConfig {
  id: string;
  message: string;
  variant: ToastVariant;
}

type DialogListener = (config: DialogConfig) => void;
type ToastListener = (toast: ToastConfig) => void;

let dialogListener: DialogListener | null = null;
let toastListener: ToastListener | null = null;

export function registerPopupListeners(
  onDialog: DialogListener,
  onToast: ToastListener
): () => void {
  dialogListener = onDialog;
  toastListener = onToast;
  return () => {
    dialogListener = null;
    toastListener = null;
  };
}

function detectVariantFromTitle(title: string): PopupVariant {
  const lower = title.toLowerCase();
  if (lower.includes('lỗi') || lower.includes('không thể') || lower.includes('thất bại')) {
    return 'error';
  }
  if (lower.includes('thiếu') || lower.includes('chú ý') || lower.includes('cảnh báo')) {
    return 'warning';
  }
  if (
    lower.includes('thành công') ||
    lower.includes('đã lưu') ||
    lower.includes('đã tải') ||
    lower.includes('hoàn tất')
  ) {
    return 'success';
  }
  return 'info';
}

export function showMessage(
  title: string,
  message: string,
  onOk?: () => void,
  variant?: PopupVariant
): void {
  const resolvedVariant = variant || detectVariantFromTitle(title);
  if (dialogListener) {
    dialogListener({
      mode: 'alert',
      variant: resolvedVariant,
      title,
      message,
      confirmText: 'Đã hiểu',
      onConfirm: onOk,
    });
  } else if (onOk) {
    onOk();
  }
}

export function confirmDialog(
  title: string,
  message: string,
  onConfirm?: () => void,
  onCancel?: () => void
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (dialogListener) {
      dialogListener({
        mode: 'confirm',
        variant: 'confirm',
        title,
        message,
        confirmText: title.toLowerCase().includes('xóa') || title.toLowerCase().includes('đăng xuất')
          ? 'Xác nhận'
          : 'Đồng ý',
        cancelText: 'Hủy bỏ',
        onConfirm: () => {
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          resolve(false);
        },
      });
    } else {
      if (onConfirm) onConfirm();
      resolve(true);
    }
  });
}

export function showToast(
  message: string,
  variant: ToastVariant = 'success'
): void {
  if (toastListener) {
    toastListener({
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      message,
      variant,
    });
  }
}
