import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { categoriesApi, tagsApi, usersApi, statsApi, statusesApi, adminTelegramIdsApi } from '../services/api';
import type { AppealStatusConfig } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Tag, User, Statistics, TimelineDataPoint, ModeratorStats, AppealsByPeriodStats, TimePeriod, AdminTelegramId } from '../types';
import LoadingScreen from '../components/LoadingScreen';

type TabType = 'dashboard' | 'categories' | 'users';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

interface FlatCategory {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  order: number;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  const [statusConfigs, setStatusConfigs] = useState<AppealStatusConfig[]>([]);
  const [editingStatus, setEditingStatus] = useState<AppealStatusConfig | null>(null);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6B7280', description: '' });

  const [adminTelegramIds, setAdminTelegramIds] = useState<AdminTelegramId[]>([]);
  const [newAdminTelegramId, setNewAdminTelegramId] = useState({ telegram_id: '', name: '' });

  const [newCategory, setNewCategory] = useState({ name: '', parent_id: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#00C9C8' });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'moderator' as 'admin' | 'moderator' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [parentCategoryDropdownOpen, setParentCategoryDropdownOpen] = useState(false);

  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [moderatorsStats, setModeratorsStats] = useState<ModeratorStats[]>([]);
  const [periodStats, setPeriodStats] = useState<AppealsByPeriodStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
  const [selectedStatsPeriod, setSelectedStatsPeriod] = useState<TimePeriod>('month');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadAdvancedStats = async () => {
      try {
        const [timeline, moderators, period] = await Promise.all([
          statsApi.getTimeline(selectedPeriod),
          statsApi.getModerators(),
          statsApi.getByPeriod(selectedStatsPeriod),
        ]);
        setTimelineData(timeline);
        setModeratorsStats(moderators);
        setPeriodStats(period);
      } catch (error) {
        console.error('Failed to load advanced stats:', error);
      }
    };
    loadAdvancedStats();
  }, [selectedPeriod, selectedStatsPeriod]);

  const loadData = async () => {
    try {
      const [statsData, categoriesData, tagsData, usersData, statusesData, adminTelegramIdsData] = await Promise.all([
        statsApi.getAll(),
        categoriesApi.getAll(),
        tagsApi.getAll(),
        usersApi.getAll(),
        statusesApi.getAll(),
        adminTelegramIdsApi.getAll(),
      ]);
      setStats(statsData);
      setCategories(categoriesData);
      setTags(tagsData);
      setUsers(usersData);
      setStatusConfigs(statusesData);
      setAdminTelegramIds(adminTelegramIdsData);
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
      setParentCategoryDropdownOpen(false);
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
    const tempId = -Date.now();
    const optimisticTag: Tag = {
      id: tempId,
      name: newTag.name,
      color: newTag.color,
      is_public: false,
      order: tags.filter(t => !t.is_public).length,
      created_at: new Date().toISOString(),
    };
    setTags(prev => [...prev, optimisticTag]);
    setNewTag({ name: '', color: '#00C9C8' });
    try {
      const createdTag = await tagsApi.createInternal({ name: optimisticTag.name, color: optimisticTag.color });
      setTags(prev => prev.map(t => t.id === tempId ? createdTag : t));
    } catch (error) {
      console.error('Failed to create tag:', error);
      setTags(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    const previousTags = [...tags];
    setTags(prev => prev.map(t => t.id === editingTag.id ? editingTag : t));
    setEditingTag(null);
    try {
      await tagsApi.updateInternal(editingTag.id, { name: editingTag.name, color: editingTag.color });
    } catch (error) {
      console.error('Failed to update tag:', error);
      setTags(previousTags);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm('Удалить этот тег?')) return;
    const previousTags = [...tags];
    setTags(prev => prev.filter(t => t.id !== tag.id));
    try {
      await tagsApi.deleteInternal(tag.id);
    } catch (error) {
      console.error('Failed to delete tag:', error);
      setTags(previousTags);
    }
  };

  const handleTagDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id).replace('tag-', '');
    const overId = String(over.id).replace('tag-', '');
    
    const oldIndex = internalTags.findIndex(t => String(t.id) === activeId);
    const newIndex = internalTags.findIndex(t => String(t.id) === overId);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(internalTags, oldIndex, newIndex);
      const publicTags = tags.filter(t => t.is_public);
      setTags([...publicTags, ...newOrder]);
      try {
        await tagsApi.reorderInternal(newOrder.map(t => t.id));
      } catch (error) {
        console.error('Failed to reorder tags:', error);
        loadData();
      }
    }
  };

  const handleStatusDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = statusConfigs.findIndex(s => s.id.toString() === active.id);
    const newIndex = statusConfigs.findIndex(s => s.id.toString() === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(statusConfigs, oldIndex, newIndex);
      setStatusConfigs(newOrder);
      try {
        await statusesApi.reorder(newOrder.map(s => s.id));
      } catch (error) {
        console.error('Failed to reorder statuses:', error);
        loadData();
      }
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent, parentId: number | null) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cats = parentId === null 
      ? categories 
      : categories.find(c => c.id === parentId)?.subcategories || [];
    
    const oldIndex = cats.findIndex(c => c.id.toString() === active.id);
    const newIndex = cats.findIndex(c => c.id.toString() === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(cats, oldIndex, newIndex);
      
      if (parentId === null) {
        setCategories(newOrder);
      } else {
        setCategories(prev => prev.map(c => 
          c.id === parentId ? { ...c, subcategories: newOrder } : c
        ));
      }
      
      try {
        await categoriesApi.reorder(newOrder.map(c => c.id), parentId ?? undefined);
      } catch (error) {
        console.error('Failed to reorder categories:', error);
        loadData();
      }
    }
  };

  const handleUpdateStatus = async (status: AppealStatusConfig) => {
    const previousStatuses = [...statusConfigs];
    setStatusConfigs(prev => prev.map(s => s.id === status.id ? status : s));
    setEditingStatus(null);
    try {
      await statusesApi.update(status.id, { 
        name: status.name, 
        color: status.color, 
        description: status.description 
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      setStatusConfigs(previousStatuses);
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus.name.trim()) return;
    const statusKey = newStatus.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    try {
      const createdStatus = await statusesApi.create({
        status_key: statusKey,
        name: newStatus.name,
        color: newStatus.color,
        description: newStatus.description,
      });
      setStatusConfigs(prev => [...prev, createdStatus]);
      setNewStatus({ name: '', color: '#6B7280', description: '' });
    } catch (error) {
      console.error('Failed to create status:', error);
    }
  };

  const handleDeleteStatus = async (id: number) => {
    const status = statusConfigs.find(s => s.id === id);
    if (status?.is_system) {
      alert('Системные статусы нельзя удалять');
      return;
    }
    if (!confirm('Удалить этот статус?')) return;
    const previousStatuses = [...statusConfigs];
    setStatusConfigs(prev => prev.filter(s => s.id !== id));
    try {
      await statusesApi.delete(id);
    } catch (error) {
      console.error('Failed to delete status:', error);
      setStatusConfigs(previousStatuses);
    }
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

  const handleCreateAdminTelegramId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminTelegramId.telegram_id) return;
    try {
      const created = await adminTelegramIdsApi.create({
        telegram_id: parseInt(newAdminTelegramId.telegram_id),
        name: newAdminTelegramId.name || undefined,
      });
      setAdminTelegramIds(prev => [created, ...prev]);
      setNewAdminTelegramId({ telegram_id: '', name: '' });
    } catch (error) {
      console.error('Failed to create admin telegram id:', error);
      alert('Ошибка: возможно этот Telegram ID уже добавлен');
    }
  };

  const handleDeleteAdminTelegramId = async (id: number) => {
    if (!confirm('Удалить этот Telegram ID из списка уведомлений?')) return;
    const previousIds = [...adminTelegramIds];
    setAdminTelegramIds(prev => prev.filter(item => item.id !== id));
    try {
      await adminTelegramIdsApi.delete(id);
    } catch (error) {
      console.error('Failed to delete admin telegram id:', error);
      setAdminTelegramIds(previousIds);
    }
  };

  const flattenCategories = (cats: Category[], prefix = ''): FlatCategory[] => {
    let result: FlatCategory[] = [];
    for (const cat of cats) {
      const level = prefix.split('—').length - 1;
      result.push({ id: cat.id, name: prefix + cat.name, level, parentId: cat.parent_id || null, order: cat.order || 0 });
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

  const internalTags = useMemo(() => {
    return tags
      .filter(t => !t.is_public)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tags]);

  const tagIds = useMemo(() => internalTags.map(t => `tag-${t.id}`), [internalTags]);

  if (loading) {
    return <LoadingScreen title="Панель администратора" />;
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

              <motion.div 
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Динамика обращений</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { value: 'hour' as TimePeriod, label: 'Час' },
                      { value: 'day' as TimePeriod, label: 'День' },
                      { value: 'week' as TimePeriod, label: 'Неделя' },
                      { value: 'month' as TimePeriod, label: 'Месяц' },
                      { value: 'year' as TimePeriod, label: 'Год' },
                      { value: 'all' as TimePeriod, label: 'Все' },
                    ].map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setSelectedPeriod(period.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          selectedPeriod === period.value
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-72">
                  {timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00C9C8" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00C9C8" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)' 
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#00C9C8" 
                          strokeWidth={3}
                          fill="url(#colorCount)"
                          animationDuration={1500}
                          name="Обращения"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p>Нет данных для отображения</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Статистика модераторов</h3>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {moderatorsStats.length > 0 ? (
                      [...moderatorsStats]
                        .sort((a, b) => b.total_processed - a.total_processed)
                        .map((mod, index) => (
                          <motion.div
                            key={mod.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {mod.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{mod.username}</p>
                                <p className="text-sm text-gray-500">{mod.email}</p>
                              </div>
                            </div>
                            <div className="flex gap-6 text-right">
                              <div>
                                <p className="text-2xl font-bold text-gray-900">{mod.total_processed}</p>
                                <p className="text-xs text-gray-500">Всего обработано</p>
                              </div>
                              <div className="border-l border-gray-200 pl-6">
                                <p className="text-2xl font-bold text-primary">{mod.today_processed}</p>
                                <p className="text-xs text-gray-500">Сегодня</p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p>Нет данных о модераторах</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div 
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Обращения за период</h3>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { value: 'hour' as TimePeriod, label: 'Час' },
                        { value: 'day' as TimePeriod, label: 'День' },
                        { value: 'week' as TimePeriod, label: 'Неделя' },
                        { value: 'month' as TimePeriod, label: 'Месяц' },
                        { value: 'year' as TimePeriod, label: 'Год' },
                        { value: 'all' as TimePeriod, label: 'Все' },
                      ].map((period) => (
                        <button
                          key={period.value}
                          onClick={() => setSelectedStatsPeriod(period.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            selectedStatsPeriod === period.value
                              ? 'bg-indigo-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {periodStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl border border-gray-100"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-3xl font-bold text-gray-900">{periodStats.total}</p>
                        <p className="text-sm text-gray-600 mt-1">Всего</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </motion.div>
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-100"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-3xl font-bold text-blue-700">{periodStats.new}</p>
                        <p className="text-sm text-blue-600 mt-1">Новые</p>
                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: periodStats.total > 0 ? `${(periodStats.new / periodStats.total) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-500 mt-1">{periodStats.total > 0 ? Math.round((periodStats.new / periodStats.total) * 100) : 0}%</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-3xl font-bold text-yellow-700">{periodStats.in_progress}</p>
                        <p className="text-sm text-yellow-600 mt-1">В работе</p>
                        <div className="w-full bg-yellow-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: periodStats.total > 0 ? `${(periodStats.in_progress / periodStats.total) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <p className="text-xs text-yellow-500 mt-1">{periodStats.total > 0 ? Math.round((periodStats.in_progress / periodStats.total) * 100) : 0}%</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-100"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-3xl font-bold text-green-700">{periodStats.resolved}</p>
                        <p className="text-sm text-green-600 mt-1">Решённые</p>
                        <div className="w-full bg-green-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: periodStats.total > 0 ? `${(periodStats.resolved / periodStats.total) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <p className="text-xs text-green-500 mt-1">{periodStats.total > 0 ? Math.round((periodStats.resolved / periodStats.total) * 100) : 0}%</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-100"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-3xl font-bold text-red-700">{periodStats.rejected}</p>
                        <p className="text-sm text-red-600 mt-1">Отклонённые</p>
                        <div className="w-full bg-red-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: periodStats.total > 0 ? `${(periodStats.rejected / periodStats.total) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <p className="text-xs text-red-500 mt-1">{periodStats.total > 0 ? Math.round((periodStats.rejected / periodStats.total) * 100) : 0}%</p>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>Загрузка данных...</p>
                    </div>
                  )}
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
                    <p className="text-sm text-gray-500">Перетаскивайте для изменения порядка</p>
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
                    <div className="md:w-72 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Родительская категория</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setParentCategoryDropdownOpen(!parentCategoryDropdownOpen)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 bg-white text-left flex items-center justify-between"
                        >
                          <span className={newCategory.parent_id ? 'text-gray-900' : 'text-gray-500'}>
                            {newCategory.parent_id 
                              ? flattenCategories(categories).find(c => c.id.toString() === newCategory.parent_id)?.name || 'Выберите категорию'
                              : 'Нет (корневая)'}
                          </span>
                          <svg className={`w-5 h-5 text-gray-400 transition-transform ${parentCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <AnimatePresence>
                          {parentCategoryDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setNewCategory({ ...newCategory, parent_id: '' });
                                  setParentCategoryDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors text-gray-700 font-medium border-b border-gray-100"
                              >
                                Нет (корневая категория)
                              </button>
                              {flattenCategories(categories).filter(c => c.level === 0).map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setNewCategory({ ...newCategory, parent_id: cat.id.toString() });
                                    setParentCategoryDropdownOpen(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors flex items-center gap-2"
                                >
                                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  <span className="text-gray-900">{cat.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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

                <div className="space-y-4">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleCategoryDragEnd(e, null)}>
                    <SortableContext items={categories.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
                      {categories.map((cat) => (
                        <div key={cat.id}>
                          <SortableItem id={cat.id.toString()}>
                            <motion.div 
                              className="flex items-center justify-between p-4 rounded-xl border-2 bg-white border-gray-200 hover:border-primary-300 transition-all"
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
                                    <svg className="w-5 h-5 text-gray-400 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                    </svg>
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="font-medium text-gray-900">{cat.name}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditingCategory(cat)}
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
                          </SortableItem>
                          
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <div className="ml-8 mt-2 space-y-2">
                              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleCategoryDragEnd(e, cat.id)}>
                                <SortableContext items={cat.subcategories.map(c => c.id.toString())} strategy={verticalListSortingStrategy}>
                                  {cat.subcategories.map((subcat) => (
                                    <SortableItem key={subcat.id} id={subcat.id.toString()}>
                                      <motion.div 
                                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 border-gray-100 hover:border-gray-300 transition-all"
                                        whileHover={{ scale: 1.01 }}
                                      >
                                        {editingCategory?.id === subcat.id ? (
                                          <form onSubmit={handleUpdateCategory} className="flex gap-3 flex-1 items-center">
                                            <input
                                              type="text"
                                              value={editingCategory.name}
                                              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white text-sm"
                                            />
                                            <button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                                              Сохранить
                                            </button>
                                            <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                                              Отмена
                                            </button>
                                          </form>
                                        ) : (
                                          <>
                                            <div className="flex items-center gap-3">
                                              <svg className="w-4 h-4 text-gray-300 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                              </svg>
                                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                              <span className="text-gray-700 text-sm">{subcat.name}</span>
                                              <span className="text-xs text-gray-400">подкатегория</span>
                                            </div>
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => setEditingCategory(subcat)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Редактировать"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                              </button>
                                              <button
                                                onClick={() => handleDeleteCategory(subcat.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Удалить"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </motion.div>
                                    </SortableItem>
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </div>
                          )}
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>
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
                    <p className="text-sm text-gray-500">Перетаскивайте для изменения порядка</p>
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

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTagDragEnd}>
                  <SortableContext items={tagIds} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {internalTags.map((tag) => (
                        <SortableItem key={`tag-${tag.id}`} id={`tag-${tag.id}`}>
                          <motion.div 
                            className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all"
                            whileHover={{ scale: 1.02 }}
                          >
                            {editingTag?.id === tag.id ? (
                              <form onSubmit={handleUpdateTag} className="flex gap-2 flex-1 items-center">
                                <input
                                  type="text"
                                  value={editingTag.name}
                                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                />
                                <input
                                  type="color"
                                  value={editingTag.color || '#6B7280'}
                                  onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                                  className="w-8 h-8 rounded cursor-pointer"
                                />
                                <button type="submit" className="p-1 text-green-600 hover:bg-green-50 rounded">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button type="button" onClick={() => setEditingTag(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-center gap-3">
                                  <svg className="w-4 h-4 text-gray-300 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: tag.color || '#6B7280' }}
                                  ></div>
                                  <span className="font-medium text-gray-900">{tag.name}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setEditingTag(tag)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Редактировать"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTag(tag)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Удалить"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </>
                            )}
                          </motion.div>
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

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
                    <p className="text-sm text-gray-500">Перетаскивайте для изменения порядка отображения</p>
                  </div>
                </div>

                <form onSubmit={handleAddStatus} className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Добавить новый статус</h4>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                      <input
                        type="text"
                        value={newStatus.name}
                        onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                        placeholder="Название статуса"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                      <input
                        type="text"
                        value={newStatus.description}
                        onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
                        placeholder="Описание статуса"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
                      <input
                        type="color"
                        value={newStatus.color}
                        onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                        className="w-14 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                      />
                    </div>
                    <button type="submit" className="btn-primary whitespace-nowrap">
                      Добавить
                    </button>
                  </div>
                </form>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStatusDragEnd}>
                  <SortableContext items={statusConfigs.map(s => s.id.toString())} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {statusConfigs.map((status) => (
                        <SortableItem key={status.id} id={status.id.toString()}>
                          <motion.div 
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
                                  value={editingStatus.description || ''}
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
                                  <svg className="w-5 h-5 text-gray-300 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: status.color }}
                                  ></div>
                                  <div>
                                    <span className="font-medium text-gray-900">{status.name}</span>
                                    {status.is_system && (
                                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">системный</span>
                                    )}
                                    <p className="text-sm text-gray-500">{status.description}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingStatus(status)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Редактировать"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  {!status.is_system && (
                                    <button
                                      onClick={() => handleDeleteStatus(status.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Удалить"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </motion.div>
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>
                <div className="mt-4">
                  <button type="submit" className="btn-primary">
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Добавить пользователя
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {users.map((user) => (
                  <motion.div 
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      user.is_active 
                        ? 'bg-white border-gray-100 hover:border-gray-300' 
                        : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                    whileHover={{ scale: 1.01 }}
                  >
                    {editingUser?.id === user.id ? (
                      <form onSubmit={handleUpdateUser} className="flex flex-wrap gap-3 flex-1 items-center">
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="flex-1 min-w-[150px] px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                        />
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'moderator' })}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                        >
                          <option value="moderator">Модератор</option>
                          <option value="admin">Администратор</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingUser.is_active}
                            onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                            className="w-4 h-4 text-primary rounded"
                          />
                          <span className="text-sm text-gray-700">Активен</span>
                        </label>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          Сохранить
                        </button>
                        <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                          Отмена
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            user.role === 'admin' ? 'bg-indigo-500' : 'bg-primary'
                          }`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{user.username}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-indigo-100 text-indigo-700' 
                                  : 'bg-primary-100 text-primary-700'
                              }`}>
                                {user.role === 'admin' ? 'Администратор' : 'Модератор'}
                              </span>
                              {!user.is_active && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                                  Неактивен
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
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

              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Уведомления в Telegram</h3>
                    <p className="text-sm text-gray-500">Telegram ID администраторов для получения уведомлений о новых обращениях</p>
                  </div>
                </div>

                <form onSubmit={handleCreateAdminTelegramId} className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Добавить Telegram ID для уведомлений</h4>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telegram ID</label>
                      <input
                        type="number"
                        value={newAdminTelegramId.telegram_id}
                        onChange={(e) => setNewAdminTelegramId({ ...newAdminTelegramId, telegram_id: e.target.value })}
                        placeholder="123456789"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Имя (опционально)</label>
                      <input
                        type="text"
                        value={newAdminTelegramId.name}
                        onChange={(e) => setNewAdminTelegramId({ ...newAdminTelegramId, name: e.target.value })}
                        placeholder="Имя администратора"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 bg-white"
                      />
                    </div>
                    <button type="submit" className="btn-primary whitespace-nowrap">
                      <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Добавить
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Чтобы узнать свой Telegram ID, напишите боту @userinfobot в Telegram
                  </p>
                </form>

                {adminTelegramIds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p>Нет добавленных Telegram ID для уведомлений</p>
                    <p className="text-sm mt-1">Добавьте ID, чтобы получать уведомления о новых обращениях</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminTelegramIds.map((item) => (
                      <motion.div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-300 transition-all"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.name || 'Без имени'}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                ID: {item.telegram_id}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Добавлен: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAdminTelegramId(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
