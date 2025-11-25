import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appeal, Tag } from '../types';

interface AppealDetailProps {
  appeal: Appeal;
  tags: Tag[];
  onStatusUpdate: (id: number, status: Appeal['status']) => void;
  onAddTag: (appealId: number, tagId: number) => void;
  onRemoveTag: (appealId: number, tagId: number) => void;
  onAddComment: (appealId: number, content: string, isInternal: boolean) => void;
  onClose: () => void;
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
  const [isInternalComment, setIsInternalComment] = useState(false);

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

  const availableTags = tags.filter(
    (tag) => !appeal.tags?.some((t) => t.id === tag.id)
  );

  const handleAddComment = () => {
    if (commentText.trim()) {
      onAddComment(appeal.id, commentText, isInternalComment);
      setCommentText('');
      setIsInternalComment(false);
    }
  };

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

      <div className="space-y-6">
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

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Текст обращения</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{appeal.text}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Теги</h4>
            {availableTags.length > 0 && (
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
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              onAddTag(appeal.id, tag.id);
                              setShowTagDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                          >
                            <span className={tag.is_public ? 'text-primary-700' : 'text-purple-700'}>
                              {tag.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {tag.is_public ? '(публ.)' : '(внутр.)'}
                            </span>
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
            {appeal.tags && appeal.tags.length > 0 ? (
              appeal.tags.map((tag) => (
                <motion.span
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`px-3 py-1 rounded-full text-sm flex items-center space-x-2 ${
                    tag.is_public
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  <span>{tag.name}</span>
                  <button
                    onClick={() => onRemoveTag(appeal.id, tag.id)}
                    className="hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                </motion.span>
              ))
            ) : (
              <p className="text-sm text-gray-500">Тегов нет</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Комментарии</h4>
          <div className="space-y-3">
            {appeal.comments && appeal.comments.length > 0 ? (
              appeal.comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg ${
                    comment.is_internal ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.user?.full_name || 'Модератор'}
                    </span>
                    <div className="flex items-center space-x-2">
                      {comment.is_internal && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-200 text-purple-800">
                          Внутренний
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Комментариев нет</p>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Добавить комментарий..."
              className="input-field resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isInternalComment}
                  onChange={(e) => setIsInternalComment(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Внутренний комментарий</span>
              </label>
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
        </div>
      </div>
    </motion.div>
  );
};

export default AppealDetail;
