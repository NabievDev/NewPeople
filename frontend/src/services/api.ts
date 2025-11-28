import axios from 'axios';
import type { Category, Tag, Appeal, AppealCreate, LoginCredentials, AuthToken, User, Comment, AppealHistoryItem, Statistics, TimelineDataPoint, ModeratorStats, AppealsByPeriodStats, TimePeriod, AppealStatusConfig } from '../types';

export type { AppealStatusConfig } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const params = new URLSearchParams();
    params.append('username', credentials.username);
    params.append('password', credentials.password);
    
    const response = await api.post<AuthToken>('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },
};

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },
  
  create: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<Category>): Promise<Category> => {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },
  
  reorder: async (categoryIds: number[], parentId?: number): Promise<void> => {
    await api.put('/categories/reorder', { category_ids: categoryIds, parent_id: parentId ?? 0 });
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const response = await api.get<Tag[]>('/tags');
    return response.data;
  },
  
  getPublic: async (): Promise<Tag[]> => {
    const response = await api.get<Tag[]>('/tags/public');
    return response.data;
  },
  
  getInternal: async (): Promise<Tag[]> => {
    const response = await api.get<Tag[]>('/tags/internal');
    return response.data;
  },
  
  createPublic: async (data: { name: string; color?: string }): Promise<Tag> => {
    const response = await api.post<Tag>('/tags/public', data);
    return response.data;
  },
  
  createInternal: async (data: { name: string; color?: string }): Promise<Tag> => {
    const response = await api.post<Tag>('/tags/internal', data);
    return response.data;
  },
  
  updateInternal: async (id: number, data: { name?: string; color?: string }): Promise<Tag> => {
    const response = await api.patch<Tag>(`/tags/internal/${id}`, data);
    return response.data;
  },
  
  reorderInternal: async (tagIds: number[]): Promise<void> => {
    await api.put('/tags/internal/reorder', { tag_ids: tagIds });
  },
  
  deletePublic: async (id: number): Promise<void> => {
    await api.delete(`/tags/public/${id}`);
  },
  
  deleteInternal: async (id: number): Promise<void> => {
    await api.delete(`/tags/internal/${id}`);
  },
};

export const appealsApi = {
  getAll: async (params?: {
    status?: string;
    public_tag_id?: number;
    internal_tag_id?: number;
    category_id?: number;
  }): Promise<Appeal[]> => {
    const response = await api.get<Appeal[]>('/appeals', { params });
    return response.data;
  },
  
  getById: async (id: number): Promise<Appeal> => {
    const response = await api.get<Appeal>(`/appeals/${id}`);
    return response.data;
  },
  
  search: async (query: string): Promise<Appeal[]> => {
    const response = await api.get<Appeal[]>('/appeals/search', { params: { q: query } });
    return response.data;
  },
  
  getHistory: async (id: number): Promise<AppealHistoryItem[]> => {
    const response = await api.get<AppealHistoryItem[]>(`/appeals/${id}/history`);
    return response.data;
  },
  
  create: async (data: AppealCreate): Promise<Appeal> => {
    const formData = new FormData();
    formData.append('is_anonymous', data.is_anonymous.toString());
    if (data.author_name) {
      formData.append('author_name', data.author_name);
    }
    if (data.email) {
      formData.append('email', data.email);
    }
    if (data.phone) {
      formData.append('phone', data.phone);
    }
    if (data.category_id) {
      formData.append('category_id', data.category_id.toString());
    }
    formData.append('text', data.text);
    if (data.attachment) {
      formData.append('files', data.attachment);
    }
    if (data.telegram_user_id) {
      formData.append('telegram_user_id', data.telegram_user_id.toString());
    }
    if (data.telegram_username) {
      formData.append('telegram_username', data.telegram_username);
    }
    
    const response = await api.post<Appeal>('/appeals', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  updateStatus: async (id: number, status: Appeal['status']): Promise<Appeal> => {
    const response = await api.put<Appeal>(`/appeals/${id}`, { status });
    return response.data;
  },
  
  updateTags: async (id: number, publicTagIds: number[], internalTagIds: number[]): Promise<Appeal> => {
    const response = await api.put<Appeal>(`/appeals/${id}`, { 
      public_tag_ids: publicTagIds,
      internal_tag_ids: internalTagIds
    });
    return response.data;
  },
  
  addTag: async (appealId: number, tagId: number, tagType: 'public' | 'internal'): Promise<void> => {
    await api.post(`/appeals/${appealId}/tags/${tagId}?tag_type=${tagType}`);
  },
  
  removeTag: async (appealId: number, tagId: number, tagType: 'public' | 'internal'): Promise<void> => {
    await api.delete(`/appeals/${appealId}/tags/${tagId}?tag_type=${tagType}`);
  },
  
  addComment: async (appealId: number, content: string, files?: FileList): Promise<Comment> => {
    const formData = new FormData();
    formData.append('text', content);
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }
    const response = await api.post<Comment>(`/appeals/${appealId}/comments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getComments: async (appealId: number): Promise<Comment[]> => {
    const response = await api.get<Comment[]>(`/appeals/${appealId}/comments`);
    return response.data;
  },
  
  getFileUrl: (filename: string): string => {
    return `/api/appeals/files/${filename}`;
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
  
  create: async (data: { username: string; email: string; password: string; role: 'admin' | 'moderator' }): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },
  
  update: async (id: number, data: Partial<{ username: string; email: string; password: string; role: string; is_active: boolean }>): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  
  getStatistics: async (): Promise<Statistics> => {
    const response = await api.get<Statistics>('/users/statistics');
    return response.data;
  },
};

export const statsApi = {
  getAll: async (): Promise<Statistics> => {
    const response = await api.get<Statistics>('/stats');
    return response.data;
  },
  
  getTimeline: async (period: TimePeriod): Promise<TimelineDataPoint[]> => {
    const response = await api.get<TimelineDataPoint[]>('/stats/appeals-timeline', { params: { period } });
    return response.data;
  },
  
  getModerators: async (): Promise<ModeratorStats[]> => {
    const response = await api.get<ModeratorStats[]>('/stats/moderators');
    return response.data;
  },
  
  getByPeriod: async (period: TimePeriod): Promise<AppealsByPeriodStats> => {
    const response = await api.get<AppealsByPeriodStats>('/stats/appeals-by-period', { params: { period } });
    return response.data;
  },
};

export const statusesApi = {
  getAll: async (): Promise<AppealStatusConfig[]> => {
    const response = await api.get<AppealStatusConfig[]>('/statuses');
    return response.data;
  },
  
  create: async (data: { status_key: string; name: string; color?: string; description?: string }): Promise<AppealStatusConfig> => {
    const response = await api.post<AppealStatusConfig>('/statuses', data);
    return response.data;
  },
  
  update: async (id: number, data: { name?: string; color?: string; description?: string; order?: number }): Promise<AppealStatusConfig> => {
    const response = await api.patch<AppealStatusConfig>(`/statuses/${id}`, data);
    return response.data;
  },
  
  reorder: async (statusIds: number[]): Promise<void> => {
    await api.put('/statuses/reorder', { status_ids: statusIds });
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/statuses/${id}`);
  },
};

export default api;
