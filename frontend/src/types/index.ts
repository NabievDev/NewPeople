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
  order?: number;
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
  telegram_user_id?: number;
  telegram_username?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme: 'light' | 'dark';
  headerColor: string;
  backgroundColor: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  platform: string;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
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

export interface TimelineDataPoint {
  date: string;
  count: number;
  label: string;
}

export interface ModeratorStats {
  id: number;
  username: string;
  email: string;
  total_processed: number;
  today_processed: number;
}

export interface AppealsByPeriodStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface AppealStatusConfig {
  id: number;
  status_key: string;
  name: string;
  color: string;
  description?: string;
  order: number;
  is_system: boolean;
  created_at: string;
}
