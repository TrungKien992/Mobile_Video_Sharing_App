export function validateRequired(value: string, label?: string): string | null {
  return value.trim() ? null : `Vui lòng nhập ${label || 'thông tin này'}`;
}

export const validateEmail = (v: string): string | null => {
  const trimmed = v.trim();
  if (!trimmed) return 'Vui lòng nhập email';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? null : 'Email không đúng định dạng (vd: demo@vclip.vn)';
};

export const validatePassword = (v: string): string | null => {
  if (!v) return 'Vui lòng nhập mật khẩu';
  if (v.length < 6) return 'Mật khẩu phải có tối thiểu 6 ký tự';
  return null;
};

export const validatePhone = (v: string): string | null => {
  const trimmed = v.trim();
  if (!trimmed) return 'Vui lòng nhập số điện thoại';
  const cleaned = trimmed.replace(/\s/g, '');
  return /^(0|\+84)\d{9}$/.test(cleaned)
    ? null
    : 'Số điện thoại không hợp lệ (vd: 0901234567)';
};

export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Đã xảy ra lỗi kết nối, vui lòng thử lại.';
};
