import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appeal, Tag, AppealHistoryItem, FileInfo } from '../types';
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
  const [loadingHistory, setLoadingHistory] = useState(false);
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
    if (activeTab === 'history') {
      loadHistory();
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

  const publicTags = tags.filter((t) => t.is_public);
  const internalTags = tags.filter((t) => !t.is_public);

  const availablePublicTags = publicTags.filter(
    (tag) => !appeal.public_tags?.some((t) => t.id === tag.id)
  );
  const availableInternalTags = internalTags.filter(
    (tag) => !appeal.internal_tags?.some((t) => t.id === tag.id)
  );

  const handleAddComment = () => {
    if (commentText.trim()) {
      onAddComment(appeal.id, commentText, commentFiles || undefined);
      setCommentText('');
      setCommentFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const getHistoryActionLabel = (item: AppealHistoryItem): string => {
    const details = item.details ? JSON.parse(item.details) : {};
    switch (item.action_type) {
      case 'status_change':
        return `Изменён статус: ${statusLabels[item.old_value as keyof typeof statusLabels] || item.old_value} → ${statusLabels[item.new_value as keyof typeof statusLabels] || item.new_value}`;
      case 'tag_added':
        return `Добавлен тег "${details.tag_name}" (${details.tag_type === 'public' ? 'публичный' : 'внутренний'})`;
      case 'tag_removed':
        return `Удалён тег "${details.tag_name}" (${details.tag_type === 'public' ? 'публичный' : 'внутренний'})`;
      case 'comment_added':
        return `Добавлен комментарий${details.files_count ? ` с ${details.files_count} файлами` : ''}`;
      case 'file_added':
        return 'Добавлен файл';
      case 'file_removed':
        return 'Удалён файл';
      default:
        return 'Изменение';
    }
  };

  const mediaFiles = parseFiles(appeal.media_files);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="card"
    >
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Обращение #{appeal.id}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['details', 'comments', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'details' && 'Детали'}
            {tab === 'comments' && `Комментарии (${appeal.comments?.length || 0})`}
            {tab === 'history' && 'История'}
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
            {/* Status */}
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

            {/* Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Информация</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Автор:</span>{' '}
                  {appeal.is_anonymous ? 'Анонимное обращение' : appeal.author_name}
                </p>
                {!appeal.is_anonymous && appeal.email && (
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {appeal.email}
                  </p>
                )}
                {appeal.phone && (
                  <p className="text-sm">
                    <span className="font-medium">Телефон:</span> {appeal.phone}
                  </p>
                )}
                {appeal.category && (
                  <p className="text-sm">
                    <span className="font-medium">Категория:</span> {appeal.category.name}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-medium">Создано:</span> {formatDate(appeal.created_at)}
                </p>
              </div>
            </div>

            {/* Appeal text */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Текст обращения</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{appeal.text}</p>
              </div>
            </div>

            {/* Attached files from sender */}
            {mediaFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Приложенные файлы</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm text-gray-700 truncate">{file.original_name}</span>
                      <a
                        href={appealsApi.getFileUrl(file.unique_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-700 text-sm font-medium"
                      >
                        Скачать
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Теги</h4>
                {(availablePublicTags.length > 0 || availableInternalTags.length > 0) && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTagDropdown(!showTagDropdown)}
                      className="text-primary hover:text-primary-700 text-sm font-medium"
                    >
                      + Добавить тег
                    </button>
                    <AnimatePresence>
                      {showTagDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                        >
                          <div className="max-h-64 overflow-y-auto">
                            {availablePublicTags.length > 0 && (
                              <div className="p-2">
                                <p className="text-xs font-medium text-gray-500 px-2 mb-1">Публичные</p>
                                {availablePublicTags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => {
                                      onAddTag(appeal.id, tag.id, 'public');
                                      setShowTagDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors rounded"
                                  >
                                    <span className="text-primary-700">{tag.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {availableInternalTags.length > 0 && (
                              <div className="p-2 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-500 px-2 mb-1">Внутренние</p>
                                {availableInternalTags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => {
                                      onAddTag(appeal.id, tag.id, 'internal');
                                      setShowTagDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors rounded"
                                  >
                                    <span className="text-purple-700">{tag.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {appeal.public_tags && appeal.public_tags.length > 0 && appeal.public_tags.map((tag) => (
                  <motion.span
                    key={`public-${tag.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1 rounded-full text-sm flex items-center space-x-2 bg-primary-100 text-primary-800"
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => onRemoveTag(appeal.id, tag.id, 'public')}
                      className="hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
                {appeal.internal_tags && appeal.internal_tags.length > 0 && appeal.internal_tags.map((tag) => (
                  <motion.span
                    key={`internal-${tag.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1 rounded-full text-sm flex items-center space-x-2 bg-purple-100 text-purple-800"
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => onRemoveTag(appeal.id, tag.id, 'internal')}
                      className="hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </motion.span>
                ))}
                {(!appeal.public_tags || appeal.public_tags.length === 0) && (!appeal.internal_tags || appeal.internal_tags.length === 0) && (
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
            {/* Comments list */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appeal.comments && appeal.comments.length > 0 ? (
                appeal.comments.map((comment) => {
                  const commentFiles = parseFiles(comment.files);
                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user?.username || 'Модератор'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                      {commentFiles.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-gray-500">Файлы:</p>
                          {commentFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <a
                                href={appealsApi.getFileUrl(file.unique_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                {file.original_name}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Комментариев пока нет</p>
              )}
            </div>

            {/* Add comment form */}
            <div className="border-t pt-4 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напишите комментарий..."
                className="input-field resize-none w-full"
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
                    className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Прикрепить файлы
                  </label>
                  {commentFiles && commentFiles.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({commentFiles.length} файлов)
                    </span>
                  )}
                </div>
                <motion.button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="btn-primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Добавить
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{getHistoryActionLabel(item)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.user?.username || 'Система'} • {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">История изменений пуста</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AppealDetail;
