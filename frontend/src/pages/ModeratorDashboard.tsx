import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appealsApi, tagsApi, categoriesApi } from '../services/api';
import type { Appeal, Tag, Category } from '../types';
import AppealCard from '../components/AppealCard';
import AppealDetail from '../components/AppealDetail';
import { useAuth } from '../contexts/AuthContext';

const ModeratorDashboard: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [statusFilter, setStatusFilter] = useState<Appeal['status'] | 'all'>('all');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedTagType, setSelectedTagType] = useState<'public' | 'internal' | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Appeal[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appealsData, tagsData, categoriesData] = await Promise.all([
        appealsApi.getAll(),
        tagsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setAppeals(appealsData);
      setTags(tagsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await appealsApi.search(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleAddTag = async (appealId: number, tagId: number, tagType: 'public' | 'internal') => {
    try {
      await appealsApi.addTag(appealId, tagId, tagType);
      await loadData();
      if (selectedAppeal?.id === appealId) {
        const updated = await appealsApi.getById(appealId);
        setSelectedAppeal(updated);
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (appealId: number, tagId: number, tagType: 'public' | 'internal') => {
    try {
      await appealsApi.removeTag(appealId, tagId, tagType);
      await loadData();
      if (selectedAppeal?.id === appealId) {
        const updated = await appealsApi.getById(appealId);
        setSelectedAppeal(updated);
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleAddComment = async (appealId: number, content: string, files?: FileList) => {
    try {
      await appealsApi.addComment(appealId, content, files);
      const updated = await appealsApi.getById(appealId);
      setSelectedAppeal(updated);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSelectedTagId(null);
    setSelectedTagType(null);
    setSelectedCategoryId(null);
    setSearchQuery('');
    setSearchResults(null);
  };

  // Filter appeals
  const filteredAppeals = useMemo(() => {
    let result = searchResults || appeals;
    
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    
    if (selectedTagId && selectedTagType) {
      result = result.filter((a) => {
        const tagList = selectedTagType === 'public' ? a.public_tags : a.internal_tags;
        return tagList?.some((t) => t.id === selectedTagId);
      });
    }
    
    if (selectedCategoryId) {
      result = result.filter((a) => a.category_id === selectedCategoryId);
    }
    
    return result;
  }, [appeals, searchResults, statusFilter, selectedTagId, selectedTagType, selectedCategoryId]);

  const statusCounts = useMemo(() => ({
    all: appeals.length,
    new: appeals.filter((a) => a.status === 'new').length,
    in_progress: appeals.filter((a) => a.status === 'in_progress').length,
    resolved: appeals.filter((a) => a.status === 'resolved').length,
    rejected: appeals.filter((a) => a.status === 'rejected').length,
  }), [appeals]);

  const publicTags = useMemo(() => tags.filter((t) => t.is_public), [tags]);
  const internalTags = useMemo(() => tags.filter((t) => !t.is_public), [tags]);

  const flattenCategories = (cats: Category[], prefix = ''): { id: number; name: string }[] => {
    let result: { id: number; name: string }[] = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: prefix + cat.name });
      if (cat.subcategories && cat.subcategories.length > 0) {
        result = result.concat(flattenCategories(cat.subcategories, prefix + '— '));
      }
    }
    return result;
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
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                На главную
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Выйти
              </motion.button>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по обращениям, авторам, комментариям..."
                className="input-field w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            {searchResults !== null && (
              <p className="text-sm text-gray-500 mt-2">
                Найдено: {searchResults.length} обращений
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="ml-2 text-primary hover:underline"
                >
                  Сбросить поиск
                </button>
              </p>
            )}
          </motion.div>

          {/* Status filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 flex flex-wrap gap-3"
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

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 flex flex-wrap gap-4 items-center"
          >
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="input-field"
            >
              <option value="">Все категории</option>
              {flattenCategories(categories).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {(selectedTagId || selectedCategoryId || statusFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Сбросить все фильтры
              </button>
            )}
          </motion.div>

          {/* Tags sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 space-y-3"
          >
            {/* Public tags */}
            {publicTags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Публичные теги:</p>
                <div className="flex flex-wrap gap-2">
                  {publicTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (selectedTagId === tag.id && selectedTagType === 'public') {
                          setSelectedTagId(null);
                          setSelectedTagType(null);
                        } else {
                          setSelectedTagId(tag.id);
                          setSelectedTagType('public');
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedTagId === tag.id && selectedTagType === 'public'
                          ? 'bg-primary text-white'
                          : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Internal tags */}
            {internalTags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Внутренние теги:</p>
                <div className="flex flex-wrap gap-2">
                  {internalTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (selectedTagId === tag.id && selectedTagType === 'internal') {
                          setSelectedTagId(null);
                          setSelectedTagType(null);
                        } else {
                          setSelectedTagId(tag.id);
                          setSelectedTagType('internal');
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-all ${
                        selectedTagId === tag.id && selectedTagType === 'internal'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Список обращений ({filteredAppeals.length})
            </h2>
            <AnimatePresence mode="popLayout">
              {filteredAppeals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-gray-500"
                >
                  Нет обращений с выбранными фильтрами
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
                onRefresh={async () => {
                  const updated = await appealsApi.getById(selectedAppeal.id);
                  setSelectedAppeal(updated);
                }}
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
