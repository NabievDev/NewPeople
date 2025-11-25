import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { categoriesApi, tagsApi, usersApi, statsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Tag, User, Statistics } from '../types';

type TabType = 'dashboard' | 'categories' | 'users' | 'settings';

interface AppealStatus {
  id: string;
  name: string;
  color: string;
  description: string;
}

const defaultStatuses: AppealStatus[] = [
  { id: 'new', name: 'Новое', color: '#3B82F6', description: 'Обращение только поступило' },
  { id: 'in_progress', name: 'В работе', color: '#F59E0B', description: 'Обращение находится в обработке' },
  { id: 'resolved', name: 'Решено', color: '#10B981', description: 'Обращение успешно обработано' },
  { id: 'rejected', name: 'Отклонено', color: '#EF4444', description: 'Обращение отклонено' },
];

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  const [statuses, setStatuses] = useState<AppealStatus[]>(() => {
    const saved = localStorage.getItem('appealStatuses');
    return saved ? JSON.parse(saved) : defaultStatuses;
  });
  const [editingStatus, setEditingStatus] = useState<AppealStatus | null>(null);

  const [newCategory, setNewCategory] = useState({ name: '', parent_id: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#00C9C8' });
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'moderator' as 'admin' | 'moderator' });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [systemSettings, setSystemSettings] = useState({
    siteName: 'Обращения к партии "Новые Люди"',
    notificationEmail: '',
    autoAssign: false,
    emailNotifications: true,
    smsNotifications: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    maxFileSize: 10,
    allowedFileTypes: 'pdf,doc,docx,jpg,png,mp4',
    autoCloseResolved: 7,
    requirePhoneNumber: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('appealStatuses', JSON.stringify(statuses));
  }, [statuses]);

  const loadData = async () => {
    try {
      const [statsData, categoriesData, tagsData, usersData] = await Promise.all([
        statsApi.getAll(),
        categoriesApi.getAll(),
        tagsApi.getAll(),
        usersApi.getAll(),
      ]);
      setStats(statsData);
      setCategories(categoriesData);
      setTags(tagsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const formatResolutionTime = (time: { weeks: number; days: number; hours: number; minutes: number } | undefined) => {
    if (!time) return 'Нет данных';
    const parts = [];
    if (time.weeks > 0) parts.push(`${time.weeks} нед.`);
    if (time.days > 0) parts.push(`${time.days} дн.`);
    if (time.hours > 0) parts.push(`${time.hours} ч.`);
    if (time.minutes > 0) parts.push(`${time.minutes} мин.`);
    return parts.length > 0 ? parts.join(' ') : 'Менее минуты';
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categoriesApi.create({
        name: newCategory.name,
        parent_id: newCategory.parent_id ? parseInt(newCategory.parent_id) : undefined,
      });
      setNewCategory({ name: '', parent_id: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await categoriesApi.update(editingCategory.id, { name: editingCategory.name });
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Удалить эту категорию?')) return;
    try {
      await categoriesApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tagsApi.createInternal({ name: newTag.name, color: newTag.color });
      setNewTag({ name: '', color: '#00C9C8' });
      loadData();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm('Удалить этот тег?')) return;
    try {
      await tagsApi.deleteInternal(tag.id);
      loadData();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleUpdateStatus = (status: AppealStatus) => {
    setStatuses(prev => prev.map(s => s.id === status.id ? status : s));
    setEditingStatus(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.create(newUser);
      setNewUser({ username: '', email: '', password: '', role: 'moderator' });
      loadData();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await usersApi.update(editingUser.id, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active,
      });
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Удалить этого пользователя?')) return;
    try {
      await usersApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    alert('Настройки сохранены!');
  };

  const flattenCategories = (cats: Category[], prefix = ''): { id: number; name: string; level: number }[] => {
    let result: { id: number; name: string; level: number }[] = [];
    for (const cat of cats) {
      const level = prefix.split('—').length - 1;
      result.push({ id: cat.id, name: prefix + cat.name, level });
      if (cat.subcategories && cat.subcategories.length > 0) {
        result = result.concat(flattenCategories(cat.subcategories, prefix + '— '));
      }
    }
    return result;
  };

  const getStatusChartData = () => {
    if (!stats) return [];
    return [
      { name: 'Новые', value: stats.new_appeals, color: '#3B82F6' },
      { name: 'В работе', value: stats.in_progress_appeals, color: '#F59E0B' },
      { name: 'Решённые', value: stats.resolved_appeals, color: '#10B981' },
      { name: 'Отклонённые', value: stats.rejected_appeals, color: '#EF4444' },
    ].filter(item => item.value > 0);
  };

  const internalTags = tags.filter(t => !t.is_public);

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
              <h1 className="text-3xl font-bold text-gray-900">Панель администратора</h1>
              <p className="text-gray-600 mt-1">Управление системой обращений партии "Новые Люди"</p>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => window.location.href = '/moderator'}
                className="px-4 py-2 text-sm text-primary hover:text-primary-700 transition-colors font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Панель модератора
              </motion.button>
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

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: 'dashboard', label: 'Статистика', icon: (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )},
              { id: 'categories', label: 'Категории и теги', icon: (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              )},
              { id: 'users', label: 'Пользователи', icon: (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )},
              { id: 'settings', label: 'Настройки', icon: (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )},
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center px-5 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && stats && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div 
                  className="card bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-500"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Всего обращений</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_appeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="card bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Новые</p>
                      <p className="text-3xl font-bold text-blue-700 mt-2">{stats.new_appeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600">В работе</p>
                      <p className="text-3xl font-bold text-yellow-700 mt-2">{stats.in_progress_appeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="card bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Решённые</p>
                      <p className="text-3xl font-bold text-green-700 mt-2">{stats.resolved_appeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="card bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Отклонённые</p>
                      <p className="text-3xl font-bold text-red-700 mt-2">{stats.rejected_appeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  className="card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Распределение по статусам</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getStatusChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getStatusChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div 
                  className="card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Статистика обработки</h3>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-primary-700 font-medium">Среднее время обработки</p>
                          <p className="text-2xl font-bold text-primary-900">
                            {formatResolutionTime(stats.average_resolution_time)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Эффективность</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {stats.total_appeals > 0 
                            ? Math.round((stats.resolved_appeals / stats.total_appeals) * 100) 
                            : 0}%
                        </p>
                        <p className="text-xs text-gray-500">решённых обращений</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Активных</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {users.filter(u => u.is_active).length}
                        </p>
                        <p className="text-xs text-gray-500">модераторов</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div 
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Статистика по тегам</h3>
                {stats.internal_tag_stats.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.internal_tag_stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="tag_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#00C9C8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <p>Нет данных по тегам</p>
                  </div>
                )}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Быстрые действия</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/moderator'}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-left font-medium"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Перейти к обращениям
                    </button>
                    <button
                      onClick={() => setActiveTab('categories')}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left font-medium"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Управление категориями и тегами
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left font-medium"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Управление пользователями
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Сводка системы</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Категорий</span>
                      <span className="font-bold text-gray-900">{flattenCategories(categories).length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Тегов</span>
                      <span className="font-bold text-gray-900">{internalTags.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Пользователей</span>
                      <span className="font-bold text-gray-900">{users.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Активных модераторов</span>
                      <span className="font-bold text-gray-900">{users.filter(u => u.is_active && u.role === 'moderator').length}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Категории обращений</h3>
                    <p className="text-sm text-gray-500">Управляйте категориями для классификации обращений</p>
                  </div>
                </div>

                <form onSubmit={handleCreateCategory} className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Добавить новую категорию</h4>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Название категории</label>
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Введите название категории"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div className="md:w-64">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Родительская категория</label>
                      <select
                        value={newCategory.parent_id}
                        onChange={(e) => setNewCategory({ ...newCategory, parent_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 bg-white"
                      >
                        <option value="">Нет (корневая)</option>
                        {flattenCategories(categories).map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="btn-primary whitespace-nowrap">
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Добавить
                      </button>
                    </div>
                  </div>
                </form>

                <div className="space-y-2">
                  {flattenCategories(categories).map((cat) => (
                    <motion.div 
                      key={cat.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        cat.level === 0 
                          ? 'bg-white border-gray-200 hover:border-primary-300' 
                          : 'bg-gray-50 border-gray-100 hover:border-gray-300 ml-6'
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      {editingCategory?.id === cat.id ? (
                        <form onSubmit={handleUpdateCategory} className="flex gap-3 flex-1 items-center">
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                          />
                          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            Сохранить
                          </button>
                          <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            Отмена
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${cat.level === 0 ? 'bg-primary' : 'bg-gray-400'}`}></div>
                            <span className={`${cat.level === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                              {cat.name.replace(/^—\s*/g, '')}
                            </span>
                            {cat.level > 0 && (
                              <span className="text-xs text-gray-400">подкатегория</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const original = categories.find(c => c.id === cat.id);
                                if (original) setEditingCategory(original as Category);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Теги</h3>
                    <p className="text-sm text-gray-500">Внутренние теги для организации работы</p>
                  </div>
                </div>

                <form onSubmit={handleCreateTag} className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Добавить новый тег</h4>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Название тега</label>
                      <input
                        type="text"
                        value={newTag.name}
                        onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                        placeholder="Введите название тега"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newTag.color}
                          onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                          className="w-14 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                        />
                        <span className="text-sm text-gray-500">{newTag.color}</span>
                      </div>
                    </div>
                    <button type="submit" className="btn-primary whitespace-nowrap">
                      <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Добавить
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {internalTags.map((tag) => (
                    <motion.div 
                      key={tag.id} 
                      className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        ></div>
                        <span className="font-medium text-gray-900">{tag.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </div>

                {internalTags.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Тегов пока нет. Добавьте первый тег выше.</p>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Статусы обращений</h3>
                    <p className="text-sm text-gray-500">Настройка отображения статусов</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {statuses.map((status) => (
                    <motion.div 
                      key={status.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all"
                      whileHover={{ scale: 1.01 }}
                    >
                      {editingStatus?.id === status.id ? (
                        <div className="flex flex-col md:flex-row gap-3 flex-1 items-center">
                          <input
                            type="text"
                            value={editingStatus.name}
                            onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                          <input
                            type="text"
                            value={editingStatus.description}
                            onChange={(e) => setEditingStatus({ ...editingStatus, description: e.target.value })}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                            placeholder="Описание"
                          />
                          <input
                            type="color"
                            value={editingStatus.color}
                            onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <button 
                            onClick={() => handleUpdateStatus(editingStatus)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Сохранить
                          </button>
                          <button 
                            onClick={() => setEditingStatus(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: status.color }}
                            ></div>
                            <div>
                              <span className="font-medium text-gray-900">{status.name}</span>
                              <p className="text-sm text-gray-500">{status.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingStatus(status)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Управление пользователями</h3>
                  <p className="text-sm text-gray-500">Добавление и управление модераторами и администраторами</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="bg-gray-50 rounded-xl p-6 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Добавить нового пользователя</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="username"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'moderator' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    >
                      <option value="moderator">Модератор</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="btn-primary w-full">Добавить</button>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                {users.map((user) => (
                  <motion.div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all"
                    whileHover={{ scale: 1.01 }}
                  >
                    {editingUser?.id === user.id ? (
                      <form onSubmit={handleUpdateUser} className="flex gap-3 flex-1 items-center flex-wrap">
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'moderator' })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        >
                          <option value="moderator">Модератор</option>
                          <option value="admin">Администратор</option>
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingUser.is_active}
                            onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">Активен</span>
                        </label>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Сохранить</button>
                        <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Отмена</button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-lg font-medium text-gray-600">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Администратор' : 'Модератор'}
                          </span>
                          {!user.is_active && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Неактивен</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Общие настройки</h3>
                    <p className="text-sm text-gray-500">Основные параметры системы</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название системы
                    </label>
                    <input
                      type="text"
                      value={systemSettings.siteName}
                      onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email для уведомлений
                    </label>
                    <input
                      type="email"
                      value={systemSettings.notificationEmail}
                      onChange={(e) => setSystemSettings({...systemSettings, notificationEmail: e.target.value})}
                      placeholder="admin@party.ru"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Уведомления</h3>
                    <p className="text-sm text-gray-500">Настройка системы оповещений</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings({...systemSettings, emailNotifications: e.target.checked})}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Email-уведомления</p>
                      <p className="text-sm text-gray-500">Отправлять уведомления о новых обращениях на email</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.smsNotifications}
                      onChange={(e) => setSystemSettings({...systemSettings, smsNotifications: e.target.checked})}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium text-gray-900">SMS-уведомления</p>
                      <p className="text-sm text-gray-500">Отправлять SMS о срочных обращениях</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.autoAssign}
                      onChange={(e) => setSystemSettings({...systemSettings, autoAssign: e.target.checked})}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Автоматическое назначение</p>
                      <p className="text-sm text-gray-500">Автоматически назначать модератора на новые обращения</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Рабочие часы</h3>
                    <p className="text-sm text-gray-500">Время работы службы поддержки</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Начало рабочего дня
                    </label>
                    <input
                      type="time"
                      value={systemSettings.workingHoursStart}
                      onChange={(e) => setSystemSettings({...systemSettings, workingHoursStart: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Конец рабочего дня
                    </label>
                    <input
                      type="time"
                      value={systemSettings.workingHoursEnd}
                      onChange={(e) => setSystemSettings({...systemSettings, workingHoursEnd: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Настройки файлов</h3>
                    <p className="text-sm text-gray-500">Ограничения для загружаемых файлов</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальный размер файла (МБ)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.maxFileSize}
                      onChange={(e) => setSystemSettings({...systemSettings, maxFileSize: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Разрешённые типы файлов
                    </label>
                    <input
                      type="text"
                      value={systemSettings.allowedFileTypes}
                      onChange={(e) => setSystemSettings({...systemSettings, allowedFileTypes: e.target.value})}
                      placeholder="pdf,doc,jpg,png"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Дополнительно</h3>
                    <p className="text-sm text-gray-500">Дополнительные настройки системы</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Автозакрытие решённых обращений (дней)
                    </label>
                    <input
                      type="number"
                      value={systemSettings.autoCloseResolved}
                      onChange={(e) => setSystemSettings({...systemSettings, autoCloseResolved: parseInt(e.target.value)})}
                      className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                    />
                    <p className="text-sm text-gray-500 mt-1">Автоматически архивировать решённые обращения через указанное количество дней</p>
                  </div>

                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={systemSettings.requirePhoneNumber}
                      onChange={(e) => setSystemSettings({...systemSettings, requirePhoneNumber: e.target.checked})}
                      className="w-5 h-5 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Обязательный номер телефона</p>
                      <p className="text-sm text-gray-500">Требовать указание номера телефона при подаче обращения</p>
                    </div>
                  </label>
                </div>
              </div>

              <motion.button 
                onClick={handleSaveSettings}
                className="btn-primary w-full md:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Сохранить все настройки
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
