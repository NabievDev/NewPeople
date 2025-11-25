import React from 'react';
import { motion } from 'framer-motion';
import type { Appeal } from '../types';

interface AppealCardProps {
  appeal: Appeal;
  onClick: () => void;
  isSelected: boolean;
}

const AppealCard: React.FC<AppealCardProps> = ({ appeal, onClick, isSelected }) => {
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
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
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`card cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[appeal.status]}`}>
              {statusLabels[appeal.status]}
            </span>
            {appeal.is_anonymous && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Анонимно
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900">
            {appeal.author_name || 'Анонимное обращение'}
          </p>
          {appeal.category && (
            <p className="text-xs text-gray-500 mt-1">
              Категория: {appeal.category.name}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400">{formatDate(appeal.created_at)}</span>
      </div>

      <p className="text-sm text-gray-700 line-clamp-3">{appeal.text}</p>

      {((appeal.public_tags && appeal.public_tags.length > 0) || (appeal.internal_tags && appeal.internal_tags.length > 0)) && (
        <div className="flex flex-wrap gap-1 mt-3">
          {appeal.public_tags?.slice(0, 2).map((tag) => (
            <span
              key={`public-${tag.id}`}
              className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-800"
            >
              {tag.name}
            </span>
          ))}
          {appeal.internal_tags?.slice(0, 2).map((tag) => (
            <span
              key={`internal-${tag.id}`}
              className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800"
            >
              {tag.name}
            </span>
          ))}
          {((appeal.public_tags?.length || 0) + (appeal.internal_tags?.length || 0)) > 4 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{(appeal.public_tags?.length || 0) + (appeal.internal_tags?.length || 0) - 4}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default AppealCard;
