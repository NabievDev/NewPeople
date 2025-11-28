import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appeal, TelegramUser, AppealStatusConfig } from '../types';
import { statusesApi } from '../services/api';
import logoImage from '../assets/logo.png';

type SortField = 'created_at' | 'status' | 'category';
type SortOrder = 'asc' | 'desc';

const STATUS_EMOJI: Record<string, string> = {
  new: '🆕',
  in_progress: '🔄',
  resolved: '✅',
  rejected: '❌'
};

const MyAppeals: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [statuses, setStatuses] = useState<AppealStatusConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  const telegramWebApp = useMemo(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
    }
    return null;
  }, []);

  const telegramUser: TelegramUser | null = useMemo(() => {
    if (telegramWebApp?.initDataUnsafe?.user) {
      return telegramWebApp.initDataUnsafe.user;
    }
    return null;
  }, [telegramWebApp]);

  useEffect(() => {
    if (telegramWebApp) {
      telegramWebApp.ready();
      telegramWebApp.expand();
      
      if (telegramWebApp.BackButton) {
        if (selectedAppeal) {
          telegramWebApp.BackButton.show();
          telegramWebApp.BackButton.onClick(() => setSelectedAppeal(null));
        } else {
          telegramWebApp.BackButton.hide();
        }
      }
    }
    
    return () => {
      if (telegramWebApp?.BackButton) {
        telegramWebApp.BackButton.hide();
      }
    };
  }, [telegramWebApp, selectedAppeal]);

  useEffect(() => {
    const fetchData = async () => {
      if (!telegramUser?.id) {
        setError('Эта страница доступна только из Telegram');
        setIsLoading(false);
        return;
      }

      try {
        const [appealsData, statusesData] = await Promise.all([
          fetch(`/api/appeals/telegram/${telegramUser.id}`).then(r => r.json()),
          statusesApi.getAll()
        ]);
        setAppeals(appealsData);
        setStatuses(statusesData);
      } catch (err) {
        console.error('Failed to fetch appeals:', err);
        setError('Не удалось загрузить обращения');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [telegramUser]);

  const getStatusConfig = (status: string) => {
    return statuses.find(s => s.status_key === status);
  };

  const filteredAndSortedAppeals = useMemo(() => {
    let result = [...appeals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(appeal =>
        appeal.text.toLowerCase().includes(query) ||
        appeal.author_name?.toLowerCase().includes(query) ||
        appeal.category?.name.toLowerCase().includes(query) ||
        `#${appeal.id}`.includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(appeal => appeal.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'category':
          comparison = (a.category?.name || '').localeCompare(b.category?.name || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [appeals, searchQuery, statusFilter, sortField, sortOrder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center safe-area-inset">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <img src={logoImage} alt="Новые Люди" className="w-24 h-24 object-contain" />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary"
              animate={{ scale: [1, 1.3, 1.3], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-gray-600"
          >
            Загрузка обращений...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4 safe-area-inset">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-600">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (selectedAppeal) {
    const statusConfig = getStatusConfig(selectedAppeal.status);
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 safe-area-inset">
        <div className="p-4 pb-safe">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: statusConfig?.color || '#3B82F6' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{STATUS_EMOJI[selectedAppeal.status]}</span>
                  <div>
                    <h1 className="font-bold">Обращение #{selectedAppeal.id}</h1>
                    <p className="text-sm opacity-90">{statusConfig?.name || selectedAppeal.status}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAppeal(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {statusConfig?.description && (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {statusConfig.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Категория</p>
                  <p className="font-medium text-gray-900 text-sm">{selectedAppeal.category?.name || 'Не указана'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Дата подачи</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(selectedAppeal.created_at)}</p>
                </div>
              </div>

              {selectedAppeal.updated_at !== selectedAppeal.created_at && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Последнее обновление</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(selectedAppeal.updated_at)}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Текст обращения</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAppeal.text}</p>
                </div>
              </div>

              {selectedAppeal.public_tags && selectedAppeal.public_tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Теги</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppeal.public_tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: tag.color || '#00C9C8' }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 safe-area-inset">
      <div className="p-4 pb-safe">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex justify-center mb-3">
            <img src={logoImage} alt="Новые Люди" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Мои обращения</h1>
          <p className="text-gray-600 text-sm mt-1">
            {appeals.length > 0 
              ? `Всего обращений: ${appeals.length}`
              : 'У вас пока нет обращений'
            }
          </p>
        </motion.div>

        {appeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3 mb-4"
          >
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Поиск по обращениям..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === 'all'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Все
              </button>
              {statuses.map(status => (
                <button
                  key={status.status_key}
                  onClick={() => setStatusFilter(status.status_key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === status.status_key
                      ? 'text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                  style={statusFilter === status.status_key ? { backgroundColor: status.color } : {}}
                >
                  <span>{STATUS_EMOJI[status.status_key]}</span>
                  {status.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="flex-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="created_at">По дате</option>
                <option value="status">По статусу</option>
                <option value="category">По категории</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredAndSortedAppeals.length > 0 ? (
            <motion.div className="space-y-3">
              {filteredAndSortedAppeals.map((appeal, index) => {
                const statusConfig = getStatusConfig(appeal.status);
                return (
                  <motion.div
                    key={appeal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedAppeal(appeal)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div 
                      className="h-1"
                      style={{ backgroundColor: statusConfig?.color || '#3B82F6' }}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{STATUS_EMOJI[appeal.status]}</span>
                          <span className="font-bold text-gray-900">#{appeal.id}</span>
                        </div>
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: statusConfig?.color || '#3B82F6' }}
                        >
                          {statusConfig?.name || appeal.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{appeal.text}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{appeal.category?.name || 'Без категории'}</span>
                        <span>{formatDate(appeal.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : appeals.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500">Ничего не найдено</p>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="mt-3 text-primary font-medium"
              >
                Сбросить фильтры
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет обращений</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                Вы пока не подавали обращений. Подайте первое обращение через главное меню бота.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyAppeals;
