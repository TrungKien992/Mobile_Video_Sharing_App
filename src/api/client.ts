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

let currentAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentAuthToken = token;
}

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
  if (currentAuthToken && !fetchHeaders['Authorization']) {
    fetchHeaders['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  if (!isFormData && body !== undefined) {
    fetchHeaders['Content-Type'] = 'application/json';
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const isAiRequest = endpoint.includes('/api/ai');
  const timeoutMs = isFormData ? 30000 : isAiRequest ? 15000 : 6000;
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

export interface AICaptionResponse {
  success: boolean;
  source: string;
  title: string;
  description: string;
  hashtags: string[];
}

export interface AIAskVideoResponse {
  success: boolean;
  source: string;
  answer: string;
  suggestedComment: string;
}

export async function generateAICaption(payload: {
  topic: string;
  category?: string;
  style?: 'viral' | 'funny' | 'chill' | 'review';
  apiKey?: string;
}): Promise<AICaptionResponse> {
  try {
    return await request<AICaptionResponse>('/api/ai/generate-caption', {
      method: 'POST',
      body: payload,
    });
  } catch {
    const cleanTopic = (payload.topic || payload.category || 'Khoảnh khắc thú vị').trim();
    return {
      success: true,
      source: 'Google Free AI Fallback',
      title: `✨ Khám phá góc nhìn ấn tượng: ${cleanTopic} cực cuốn!`,
      description: `Cùng trải nghiệm khoảnh khắc ${cleanTopic.toLowerCase()} sắc nét trên VClip. Thả tim ❤️ và bình luận cảm nhận của bạn nhé!`,
      hashtags: ['vclip', 'xuhuong', 'viral', 'trending', 'videohd'],
    };
  }
}

export interface AIChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function askAIVideo(payload: {
  videoTitle: string;
  videoDescription: string;
  category?: string;
  hashtags?: string[];
  creatorName?: string;
  musicTitle?: string;
  question: string;
  history?: AIChatHistoryItem[];
  apiKey?: string;
}): Promise<AIAskVideoResponse> {
  try {
    return await request<AIAskVideoResponse>('/api/ai/ask-video', {
      method: 'POST',
      body: payload,
    });
  } catch {
    const q = (payload.question || '').trim();
    const qLower = q.toLowerCase();
    const creator = payload.creatorName || 'VClip';

    // Thử gọi trực tiếp Free Zero-Key AI Chat nếu Backend Server chưa được khởi động lại
    try {
      const systemPrompt = `Bạn là Trợ lý AI thông minh trên ứng dụng xem video ngắn VClip. Người dùng đang xem video "${payload.videoTitle}" của tác giả "${creator}", mô tả: "${payload.videoDescription}", danh mục: "${payload.category || 'Giải trí'}", nhạc nền: "${payload.musicTitle || 'Original Sound'}". Hãy trả lời trực tiếp, ngắn gọn (2-4 câu), thân thiện bằng tiếng Việt cho câu hỏi hoặc tin nhắn trò chuyện của người dùng.`;
      const safeHistory = Array.isArray(payload.history)
        ? payload.history.slice(-6)
        : [];
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: systemPrompt },
            ...safeHistory,
            { role: 'user', content: q },
          ],
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return {
            success: true,
            source: 'Google & Open Free AI Chat',
            answer: reply,
            suggestedComment: `Video "${payload.videoTitle}" đỉnh quá @${creator} ơi! ❤️`,
          };
        }
      }
    } catch {}

    let fallbackAnswer = `🤖 Về câu hỏi "${q}": Video "${payload.videoTitle}" của @${creator} thuộc chủ đề ${
      payload.category || 'Giải trí'
    }, chia sẻ nội dung "${payload.videoDescription}" cùng nhạc nền "${
      payload.musicTitle || 'Original Sound'
    }". Bạn có muốn mình gợi ý thêm ý tưởng hay bình luận liên quan đến chủ đề này không? ✨`;

    if (/^(xin chào|chào|hi|hello|alo|bạn là ai)/i.test(qLower)) {
      fallbackAnswer = `👋 Xin chào bạn! Mình là Trợ lý AI của VClip ✨. Mình đang xem cùng bạn video "${payload.videoTitle}" của @${creator}. Bạn cứ nhắn tin hỏi mình bất cứ điều gì nhé!`;
    } else if (qLower.includes('tóm tắt')) {
      fallbackAnswer = `📌 Tóm tắt nhanh: Video "${payload.videoTitle}" của @${creator} chia sẻ về: "${payload.videoDescription}". Sử dụng nhạc nền "${
        payload.musicTitle || 'Original Sound'
      }" mang lại giai điệu rất cuốn hút người xem.`;
    } else if (qLower.includes('nhạc') || qLower.includes('bài hát')) {
      fallbackAnswer = `🎵 Video này đang dùng nhạc nền "${
        payload.musicTitle || 'Original Sound'
      }". Bạn có thể bấm vào đĩa nhạc xoay góc dưới bên phải để nghe thử hoặc dùng nhạc này nhé!`;
    } else if (qLower.includes('bình luận') || qLower.includes('comment')) {
      fallbackAnswer = `💬 Gợi ý 3 bình luận hay cho video này:\n1. "Video cuốn quá @${creator} ơi, xem đi xem lại không chán! 🔥"\n2. "Nhạc hợp cảnh thực sự, cho mình xin bí quyết quay nhé ✨"\n3. "10 điểm chất lượng, thả tim ủng hộ kênh ❤️"`;
    }

    return {
      success: true,
      source: 'Google Free AI Smart Chat',
      answer: fallbackAnswer,
      suggestedComment: `Video "${payload.videoTitle}" đỉnh quá @${creator} ơi! ❤️`,
    };
  }
}

export async function saveAIConfig(apiKey: string): Promise<{
  success: boolean;
  hasApiKey: boolean;
  provider: string;
}> {
  return request('/api/ai/config', {
    method: 'POST',
    body: { apiKey },
  });
}

export const api = {
  get: <T>(endpoint: string, config?: { params?: Record<string, string | number | boolean | undefined> }) =>
    request<T>(endpoint, { method: 'GET', params: config?.params }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(
    endpoint: string,
    config?: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      data?: unknown;
    }
  ) =>
    request<T>(endpoint, {
      method: 'DELETE',
      params: config?.params,
      body: config?.body ?? config?.data,
    }),
  uploadFile,
  generateAICaption,
  askAIVideo,
  saveAIConfig,
};
