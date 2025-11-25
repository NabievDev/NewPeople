import axios from 'axios';
import type { Category, Tag, Appeal, AppealCreate, LoginCredentials, AuthToken, User, Comment } from '../types';

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
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post<AuthToken>('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
    const response = await api.put<Category>(`/categories/${id}`, data);
    return response.data;
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
  
  create: async (data: Partial<Tag>): Promise<Tag> => {
    const response = await api.post<Tag>('/tags', data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },
};

export const appealsApi = {
  getAll: async (): Promise<Appeal[]> => {
    const response = await api.get<Appeal[]>('/appeals');
    return response.data;
  },
  
  getById: async (id: number): Promise<Appeal> => {
    const response = await api.get<Appeal>(`/appeals/${id}`);
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
  
  addTag: async (appealId: number, tagId: number): Promise<void> => {
    await api.post(`/appeals/${appealId}/tags/${tagId}`);
  },
  
  removeTag: async (appealId: number, tagId: number): Promise<void> => {
    await api.delete(`/appeals/${appealId}/tags/${tagId}`);
  },
  
  addComment: async (appealId: number, content: string, isInternal: boolean): Promise<Comment> => {
    const response = await api.post<Comment>(`/appeals/${appealId}/comments`, {
      content,
      is_internal: isInternal,
    });
    return response.data;
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
  
  create: async (data: Partial<User> & { password: string }): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export default api;
