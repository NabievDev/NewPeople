import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appealsApi, tagsApi, categoriesApi, statusesApi } from '../services/api';
import type { AppealStatusConfig } from '../services/api';
import type { Appeal, Tag, Category } from '../types';
import AppealCard from '../components/AppealCard';
import AppealDetail from '../components/AppealDetail';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const ModeratorDashboard: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<AppealStatusConfig[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Appeal[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appealsData, tagsData, categoriesData, statusesData] = await Promise.all([
        appealsApi.getAll(),
        tagsApi.getAll(),
        categoriesApi.getAll(),
        statusesApi.getAll(),
      ]);
      setAppeals(appealsData);
      setTags(tagsData);
      setCategories(categoriesData);
      setStatusConfigs(statusesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    setSelectedCategoryId(null);
    setSearchQuery('');
    setSearchResults(null);
  };

  const filteredAppeals = useMemo(() => {
    let result = searchResults || appeals;
    
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    
    if (selectedTagId) {
      result = result.filter((a) => {
        return a.internal_tags?.some((t) => t.id === selectedTagId);
      });
    }
    
    if (selectedCategoryId) {
      result = result.filter((a) => a.category_id === selectedCategoryId);
    }
    
    return result;
  }, [appeals, searchResults, statusFilter, selectedTagId, selectedCategoryId]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: appeals.length };
    statusConfigs.forEach(config => {
      counts[config.status_key] = appeals.filter((a) => a.status === config.status_key).length;
    });
    return counts;
  }, [appeals, statusConfigs]);

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
    return <LoadingScreen title="Панель модератора" />;
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
              {user?.role === 'admin' && (
                <motion.button
                  onClick={() => window.location.href = '/admin'}
                  className="px-4 py-2 text-sm text-primary hover:text-primary-700 transition-colors font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Админ-панель
                </motion.button>
              )}
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
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 flex flex-wrap gap-3"
          >
            <motion.button
              key="all"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Все ({statusCounts.all})
            </motion.button>
            {statusConfigs.map((config) => (
              <motion.button
                key={config.status_key}
                onClick={() => setStatusFilter(config.status_key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === config.status_key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                style={statusFilter !== config.status_key ? { borderLeftWidth: '4px', borderLeftColor: config.color } : {}}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {config.name} ({statusCounts[config.status_key] || 0})
              </motion.button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 flex flex-wrap gap-4 items-center"
          >
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-left flex items-center justify-between gap-2"
              >
                <span className={selectedCategoryId ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedCategoryId 
                    ? flattenCategories(categories).find(c => c.id === selectedCategoryId)?.name || 'Все категории'
                    : 'Все категории'}
                </span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {categoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(null);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors font-medium border-b border-gray-100 ${
                        !selectedCategoryId ? 'bg-primary-50 text-primary' : 'text-gray-700'
                      }`}
                    >
                      Все категории
                    </button>
                    {flattenCategories(categories).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                          selectedCategoryId === cat.id ? 'bg-primary-50 text-primary' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${cat.name.startsWith('—') ? 'bg-gray-400' : 'bg-primary'}`}></div>
                        <span className={cat.name.startsWith('—') ? 'text-gray-600 text-sm' : 'text-gray-900'}>{cat.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(selectedTagId || selectedCategoryId || statusFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Сбросить все фильтры
              </button>
            )}
          </motion.div>

          {internalTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <p className="text-sm font-medium text-gray-700 mb-2">Теги:</p>
              <div className="flex flex-wrap gap-2">
                {internalTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (selectedTagId === tag.id) {
                        setSelectedTagId(null);
                      } else {
                        setSelectedTagId(tag.id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedTagId === tag.id
                        ? 'text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={selectedTagId === tag.id ? { backgroundColor: tag.color || '#6B7280' } : {}}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    ></span>
                    {tag.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Список обращений ({filteredAppeals.length})
              </h2>
              <button 
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Обновить список"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <AnimatePresence mode="popLayout">
              {filteredAppeals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">Нет обращений с выбранными фильтрами</p>
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
                categories={categories}
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
                className="card text-center py-16"
              >
                <svg
                  className="mx-auto h-16 w-16 text-gray-300 mb-4"
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
                <p className="text-gray-500 text-lg">Выберите обращение для просмотра</p>
                <p className="text-gray-400 text-sm mt-2">Нажмите на карточку обращения слева</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
