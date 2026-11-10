import { Platform, NativeModules } from 'react-native';

function getDefaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Trên trình duyệt Web (kể cả khi mở bằng trình duyệt điện thoại qua IP LAN)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host && !host.endsWith('.exp.direct') && !host.endsWith('.expo.dev')) {
      return `http://${host}:3000`;
    }
  }

  // Trên thiết bị thật (iOS / Android qua Expo Go): tự động lấy IP LAN của máy tính chạy Metro
  if (Platform.OS !== 'web') {
    try {
      const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        const parsed = new URL(scriptURL);
        const host = parsed.hostname;
        if (
          host &&
          host !== 'localhost' &&
          host !== '127.0.0.1' &&
          !host.endsWith('.exp.direct') &&
          !host.endsWith('.expo.dev')
        ) {
          return `http://${host}:3000`;
        }
      }
    } catch {
      // Bỏ qua và dùng IP LAN dự phòng bên dưới
    }
    return 'http://192.168.1.21:3000';
  }

  return 'http://localhost:3000';
}

export const API_BASE_URL = getDefaultBaseUrl().replace(/\/$/, '');

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3000/i, API_BASE_URL);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, headers = {} } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const fetchHeaders: Record<string, string> = {
    ...headers,
  };
  if (!isFormData && body !== undefined) {
    fetchHeaders['Content-Type'] = 'application/json';
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = isFormData ? 30000 : 6000;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: isFormData ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Lỗi kết nối máy chủ (${response.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function uploadFile(
  uriOrFile: File | { uri: string; name?: string; type?: string }
): Promise<{ url: string }> {
  const formData = new FormData();
  if (Platform.OS === 'web' && typeof File !== 'undefined' && uriOrFile instanceof File) {
    formData.append('file', uriOrFile);
  } else if ('uri' in uriOrFile) {
    formData.append('file', {
      uri: uriOrFile.uri,
      name: uriOrFile.name || `video_${Date.now()}.mp4`,
      type: uriOrFile.type || 'video/mp4',
    } as unknown as Blob);
  }
  return request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

export const api = {
  get: <T>(endpoint: string, config?: { params?: Record<string, string | number | boolean | undefined> }) =>
    request<T>(endpoint, { method: 'GET', params: config?.params }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  uploadFile,
};
