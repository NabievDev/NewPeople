export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  children?: Category[];
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  is_public: boolean;
  created_at: string;
}

export interface Appeal {
  id: number;
  author_name?: string;
  email?: string;
  phone?: string;
  category_id?: number;
  category?: Category;
  text: string;
  status: 'new' | 'in_progress' | 'resolved' | 'rejected';
  media_files?: string;
  is_anonymous: boolean;
  tags?: Tag[];
  comments?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  appeal_id: number;
  user_id: number;
  user?: User;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface AppealCreate {
  author_name?: string;
  email?: string;
  phone?: string;
  category_id: number;
  text: string;
  is_anonymous: boolean;
  attachment?: File;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}
