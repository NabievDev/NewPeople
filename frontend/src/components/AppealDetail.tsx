import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appeal, Tag, AppealHistoryItem, FileInfo, Comment } from '../types';
import { appealsApi } from '../services/api';

interface AppealDetailProps {
  appeal: Appeal;
  tags: Tag[];
  onStatusUpdate: (id: number, status: Appeal['status']) => void;
  onAddTag: (appealId: number, tagId: number, tagType: 'public' | 'internal') => void;
  onRemoveTag: (appealId: number, tagId: number, tagType: 'public' | 'internal') => void;
  onAddComment: (appealId: number, content: string, files?: FileList) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const docExts = ['doc', 'docx', 'odt', 'rtf'];
  const spreadExts = ['xls', 'xlsx', 'ods', 'csv'];
  const pdfExts = ['pdf'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
  const codeExts = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'];

  if (imageExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (videoExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (audioExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    );
  }
  
  if (docExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  
  if (spreadExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (pdfExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  
  if (archiveExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    );
  }
  
  if (codeExts.includes(ext)) {
    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
};

const getHistoryIcon = (actionType: string) => {
  switch (actionType) {
    case 'status_change':
      return (
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      );
    case 'tag_added':
      return (
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
      );
    case 'tag_removed':
      return (
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
      );
    case 'comment_added':
      return (
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    case 'file_added':
      return (
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    case 'file_removed':
      return (
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m5 6H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
};

const AppealDetail: React.FC<AppealDetailProps> = ({
  appeal,
  tags,
  onStatusUpdate,
  onAddTag,
  onRemoveTag,
  onAddComment,
  onClose,
}) => {
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState<FileList | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [history, setHistory] = useState<AppealHistoryItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusColors = {
    new: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    resolved: 'bg-green-500',
    rejected: 'bg-red-500',
  };

  const statusLabels = {
    new: 'Новое',
    in_progress: 'В работе',
    resolved: 'Решено',
    rejected: 'Отклонено',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    setComments([]);
    setHistory([]);
    setActiveTab('details');
  }, [appeal.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
    if (activeTab === 'comments') {
      loadComments();
    }
  }, [activeTab, appeal.id]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const historyData = await appealsApi.getHistory(appeal.id);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const commentsData = await appealsApi.getComments(appeal.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const internalTags = tags.filter((t) => !t.is_public);

  const availableInternalTags = internalTags.filter(
    (tag) => !appeal.internal_tags?.some((t) => t.id === tag.id)
  );

  const handleAddComment = async () => {
    if (commentText.trim()) {
      await onAddComment(appeal.id, commentText, commentFiles || undefined);
      setCommentText('');
      setCommentFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadComments();
    }
  };

  const parseFiles = (filesJson: string | null | undefined): FileInfo[] => {
    if (!filesJson) return [];
    try {
      return JSON.parse(filesJson);
    } catch {
      return [];
    }
  };

  const downloadFile = async (filename: string, originalName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/appeals/files/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Ошибка при скачивании файла');
    }
  };

  const getHistoryActionLabel = (item: AppealHistoryItem): { title: string; description: string } => {
    const details = item.details ? JSON.parse(item.details) : {};
    switch (item.action_type) {
      case 'status_change':
        return {
          title: 'Изменение статуса',
          description: `${statusLabels[item.old_value as keyof typeof statusLabels] || item.old_value} → ${statusLabels[item.new_value as keyof typeof statusLabels] || item.new_value}`
        };
      case 'tag_added':
        return {
          title: 'Добавлен тег',
          description: `"${details.tag_name}"`
        };
      case 'tag_removed':
        return {
          title: 'Удалён тег',
          description: `"${details.tag_name}"`
        };
      case 'comment_added':
        return {
          title: 'Добавлен комментарий',
          description: details.comment_text ? `"${details.comment_text.substring(0, 50)}${details.comment_text.length > 50 ? '...' : ''}"` : ''
        };
      case 'file_added':
        return {
          title: 'Добавлен файл',
          description: details.filename || ''
        };
      case 'file_removed':
        return {
          title: 'Удалён файл',
          description: details.filename || ''
        };
      default:
        return {
          title: 'Изменение',
          description: ''
        };
    }
  };

  const mediaFiles = parseFiles(appeal.media_files);
  const displayComments = comments.length > 0 ? comments : (appeal.comments || []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="card"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Обращение #{appeal.id}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(appeal.created_at)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {(['details', 'comments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === tab
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'details' && 'Детали'}
            {tab === 'comments' && `Комментарии (${displayComments.length})`}
            {tab === 'history' && 'История'}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
              <div className="flex flex-wrap gap-2">
                {(['new', 'in_progress', 'resolved', 'rejected'] as const).map((status) => (
                  <motion.button
                    key={status}
                    onClick={() => onStatusUpdate(appeal.id, status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      appeal.status === status
                        ? `${statusColors[status]} text-white shadow-md`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {statusLabels[status]}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Информация</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-500">Автор</p>
                    <p className="text-sm font-medium text-gray-900">
                      {appeal.is_anonymous ? 'Анонимное обращение' : appeal.author_name}
                    </p>
                  </div>
                </div>
                {!appeal.is_anonymous && appeal.email && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{appeal.email}</p>
                    </div>
                  </div>
                )}
                {appeal.phone && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Телефон</p>
                      <p className="text-sm font-medium text-gray-900">{appeal.phone}</p>
                    </div>
                  </div>
                )}
                {appeal.category && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">Категория</p>
                      <p className="text-sm font-medium text-gray-900">{appeal.category.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Текст обращения</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{appeal.text}</p>
              </div>
            </div>

            {mediaFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Приложенные файлы</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.original_name)}
                        <span className="text-sm text-gray-700 truncate max-w-xs">{file.original_name}</span>
                      </div>
                      <button
                        onClick={() => downloadFile(file.unique_name, file.original_name)}
                        className="flex items-center gap-1 px-3 py-1 text-primary hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Скачать
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Теги</h4>
                {availableInternalTags.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                      className="flex items-center gap-1 text-primary hover:text-primary-700 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Добавить тег
                    </button>
                    <AnimatePresence>
                      {showTagDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                        >
                          <div className="max-h-64 overflow-y-auto p-2">
                            {availableInternalTags.map((tag) => (
                              <button
                                key={tag.id}
                                onClick={() => {
                                  onAddTag(appeal.id, tag.id, 'internal');
                                  setShowTagDropdown(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors rounded"
                              >
                                <span 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: tag.color || '#6B7280' }}
                                ></span>
                                <span className="text-gray-700">{tag.name}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {appeal.internal_tags && appeal.internal_tags.length > 0 && appeal.internal_tags.map((tag) => (
                  <motion.span
                    key={`internal-${tag.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1.5 rounded-full text-sm flex items-center space-x-2 text-white"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => onRemoveTag(appeal.id, tag.id, 'internal')}
                      className="hover:opacity-70 transition-opacity ml-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.span>
                ))}
                {(!appeal.internal_tags || appeal.internal_tags.length === 0) && (
                  <p className="text-sm text-gray-500">Тегов нет</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'comments' && (
          <motion.div
            key="comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {displayComments.length > 0 ? (
                  displayComments.map((comment) => {
                    const commentFilesList = parseFiles(comment.files);
                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {(comment.user?.username || 'М').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {comment.user?.username || 'Модератор'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{comment.text}</p>
                        {commentFilesList.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-gray-200">
                            <p className="text-xs font-medium text-gray-500">Прикреплённые файлы:</p>
                            {commentFilesList.map((file, index) => (
                              <motion.div 
                                key={index} 
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                                whileHover={{ scale: 1.01 }}
                              >
                                <div className="flex items-center gap-2">
                                  {getFileIcon(file.original_name)}
                                  <span className="text-sm text-gray-700 truncate max-w-xs">{file.original_name}</span>
                                </div>
                                <button
                                  onClick={() => downloadFile(file.unique_name, file.original_name)}
                                  className="text-primary hover:text-primary-700 text-sm font-medium"
                                >
                                  Скачать
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-gray-500">Комментариев пока нет</p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напишите комментарий..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => setCommentFiles(e.target.files)}
                    className="hidden"
                    id="comment-files"
                  />
                  <label
                    htmlFor="comment-files"
                    className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Прикрепить файлы
                  </label>
                  {commentFiles && commentFiles.length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {commentFiles.length} файл(ов)
                    </span>
                  )}
                </div>
                <motion.button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: commentText.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: commentText.trim() ? 0.95 : 1 }}
                >
                  Отправить
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {history.map((item, index) => {
                    const { title, description } = getHistoryActionLabel(item);
                    return (
                      <motion.div 
                        key={item.id} 
                        className="relative flex gap-4 pl-0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="relative z-10">
                          {getHistoryIcon(item.action_type)}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{title}</p>
                              {description && (
                                <p className="text-sm text-gray-600 mt-0.5">{description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{item.user?.username || 'Система'}</span>
                            <span>•</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-500">История изменений пуста</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AppealDetail;
