export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  order?: number;
  subcategories?: Category[];
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  is_public: boolean;
  created_at: string;
}

export interface FileInfo {
  path: string;
  original_name: string;
  unique_name: string;
}

export interface Comment {
  id: number;
  appeal_id: number;
  user_id: number;
  user?: User;
  text: string;
  files?: string; // JSON string of FileInfo[]
  created_at: string;
}

export interface AppealHistoryItem {
  id: number;
  appeal_id: number;
  user_id: number;
  user?: User;
  action_type: 'status_change' | 'tag_added' | 'tag_removed' | 'comment_added' | 'file_added' | 'file_removed';
  old_value?: string;
  new_value?: string;
  details?: string; // JSON string with additional info
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
  media_files?: string; // JSON string of FileInfo[]
  is_anonymous: boolean;
  public_tags?: Tag[];
  internal_tags?: Tag[];
  comments?: Comment[];
  history?: AppealHistoryItem[];
  created_at: string;
  updated_at: string;
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

export interface TagStatistics {
  tag_id: number;
  tag_name: string;
  count: number;
  is_public: boolean;
}

export interface Statistics {
  total_appeals: number;
  new_appeals: number;
  in_progress_appeals: number;
  resolved_appeals: number;
  rejected_appeals: number;
  public_tag_stats: TagStatistics[];
  internal_tag_stats: TagStatistics[];
  average_resolution_time?: {
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
  };
}

export interface SystemSettings {
  site_name: string;
  notification_email: string;
  auto_assign_enabled: boolean;
}
