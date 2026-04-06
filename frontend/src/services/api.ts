import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, AuthResponse, Chat, ChatMember, Message, PagedResult, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<ApiResponse<AuthResponse>>('/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data!;
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; displayName: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post<ApiResponse<boolean>>('/auth/logout', { refreshToken }),

  verifyEmail: (token: string) =>
    api.get<ApiResponse<boolean>>(`/auth/verify-email?token=${token}`),

  resendVerification: () =>
    api.post<ApiResponse<boolean>>('/auth/resend-verification'),
};

// Users API
export const usersApi = {
  getMe: () =>
    api.get<ApiResponse<User>>('/users/me'),

  getUser: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  updateProfile: (data: { displayName?: string; bio?: string; username?: string }) =>
    api.put<ApiResponse<User>>('/users/me', data),

  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<ApiResponse<User>>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  search: (q: string, page = 1, pageSize = 20) =>
    api.get<ApiResponse<PagedResult<User>>>(`/users/search?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`),
};

// Chats API
export const chatsApi = {
  getChats: () =>
    api.get<ApiResponse<Chat[]>>('/chats'),

  getChat: (id: string) =>
    api.get<ApiResponse<Chat>>(`/chats/${id}`),

  createChat: (data: { type: string; name?: string; description?: string; memberIds: string[] }) =>
    api.post<ApiResponse<Chat>>('/chats', data),

  updateChat: (id: string, data: { name?: string; description?: string }) =>
    api.put<ApiResponse<Chat>>(`/chats/${id}`, data),

  updateChatAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<ApiResponse<string>>(`/chats/${id}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteChat: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/chats/${id}`),

  addMember: (chatId: string, userId: string, role = 'member') =>
    api.post<ApiResponse<boolean>>(`/chats/${chatId}/members`, { userId, role }),

  removeMember: (chatId: string, userId: string) =>
    api.delete<ApiResponse<boolean>>(`/chats/${chatId}/members/${userId}`),
};

// Messages API
export const messagesApi = {
  getMessages: (chatId: string, page = 1, pageSize = 50) =>
    api.get<ApiResponse<PagedResult<Message>>>(`/chats/${chatId}/messages?page=${page}&pageSize=${pageSize}`),

  sendMessage: (chatId: string, data: { content?: string; type?: string; replyToId?: string }, files?: File[]) => {
    const form = new FormData();
    if (data.content) form.append('content', data.content);
    form.append('type', data.type ?? 'text');
    if (data.replyToId) form.append('replyToId', data.replyToId);
    if (files) files.forEach(f => form.append('files', f));
    return api.post<ApiResponse<Message>>(`/chats/${chatId}/messages`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  editMessage: (id: string, content: string) =>
    api.put<ApiResponse<Message>>(`/messages/${id}`, { content }),

  deleteMessage: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/messages/${id}`),

  markRead: (id: string) =>
    api.post<ApiResponse<boolean>>(`/messages/${id}/read`),

  addReaction: (id: string, emoji: string) =>
    api.post<ApiResponse<boolean>>(`/messages/${id}/reactions`, { emoji }),

  removeReaction: (id: string, emoji: string) =>
    api.delete<ApiResponse<boolean>>(`/messages/${id}/reactions/${encodeURIComponent(emoji)}`),
};

// Files API
export const filesApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<{ id: string; fileName: string; filePath: string; mimeType: string }>>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
