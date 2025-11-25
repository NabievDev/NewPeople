import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appealsApi, tagsApi } from '../services/api';
import type { Appeal, Tag } from '../types';
import AppealCard from '../components/AppealCard';
import AppealDetail from '../components/AppealDetail';

const ModeratorDashboard: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [statusFilter, setStatusFilter] = useState<Appeal['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appealsData, tagsData] = await Promise.all([
        appealsApi.getAll(),
        tagsApi.getAll(),
      ]);
      setAppeals(appealsData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppealClick = async (appeal: Appeal) => {
    try {
      const fullAppeal = await appealsApi.getById(appeal.id);
      setSelectedAppeal(fullAppeal);
    } catch (error) {
      console.error('Failed to load appeal details:', error);
    }
  };

  const handleStatusUpdate = async (id: number, status: Appeal['status']) => {
    try {
      await appealsApi.updateStatus(id, status);
      await loadData();
      if (selectedAppeal?.id === id) {
        const updated = await appealsApi.getById(id);
        setSelectedAppeal(updated);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddTag = async (appealId: number, tagId: number) => {
    try {
      await appealsApi.addTag(appealId, tagId);
      await loadData();
      if (selectedAppeal?.id === appealId) {
        const updated = await appealsApi.getById(appealId);
        setSelectedAppeal(updated);
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (appealId: number, tagId: number) => {
    try {
      await appealsApi.removeTag(appealId, tagId);
      await loadData();
      if (selectedAppeal?.id === appealId) {
        const updated = await appealsApi.getById(appealId);
        setSelectedAppeal(updated);
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleAddComment = async (appealId: number, content: string, isInternal: boolean) => {
    try {
      await appealsApi.addComment(appealId, content, isInternal);
      const updated = await appealsApi.getById(appealId);
      setSelectedAppeal(updated);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const filteredAppeals = appeals.filter(
    (appeal) => statusFilter === 'all' || appeal.status === statusFilter
  );

  const statusCounts = {
    all: appeals.length,
    new: appeals.filter((a) => a.status === 'new').length,
    in_progress: appeals.filter((a) => a.status === 'in_progress').length,
    resolved: appeals.filter((a) => a.status === 'resolved').length,
    rejected: appeals.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Панель модератора</h1>
              <p className="text-gray-600 mt-1">Управление обращениями граждан</p>
            </div>
            <motion.button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← На главную
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            {(['all', 'new', 'in_progress', 'resolved', 'rejected'] as const).map((status) => {
              const labels = {
                all: 'Все',
                new: 'Новые',
                in_progress: 'В работе',
                resolved: 'Решённые',
                rejected: 'Отклонённые',
              };

              return (
                <motion.button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {labels[status]} ({statusCounts[status]})
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Список обращений
            </h2>
            <AnimatePresence mode="popLayout">
              {filteredAppeals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-gray-500"
                >
                  Нет обращений с выбранным статусом
                </motion.div>
              ) : (
                filteredAppeals.map((appeal) => (
                  <AppealCard
                    key={appeal.id}
                    appeal={appeal}
                    onClick={() => handleAppealClick(appeal)}
                    isSelected={selectedAppeal?.id === appeal.id}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            {selectedAppeal ? (
              <AppealDetail
                appeal={selectedAppeal}
                tags={tags}
                onStatusUpdate={handleStatusUpdate}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onAddComment={handleAddComment}
                onClose={() => setSelectedAppeal(null)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card text-center py-12 text-gray-500"
              >
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Выберите обращение для просмотра деталей
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
