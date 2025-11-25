import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categoriesApi, tagsApi, usersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Tag, User, Statistics } from '../types';

type TabType = 'dashboard' | 'categories' | 'users' | 'settings';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  // Form states
  const [newCategory, setNewCategory] = useState({ name: '', parent_id: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#00C9C8', is_public: true });
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'moderator' as 'admin' | 'moderator' });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, categoriesData, tagsData, usersData] = await Promise.all([
        usersApi.getStatistics(),
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

  // Category management
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

  // Tag management
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newTag.is_public) {
        await tagsApi.createPublic({ name: newTag.name, color: newTag.color });
      } else {
        await tagsApi.createInternal({ name: newTag.name, color: newTag.color });
      }
      setNewTag({ name: '', color: '#00C9C8', is_public: true });
      loadData();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!confirm('Удалить этот тег?')) return;
    try {
      if (tag.is_public) {
        await tagsApi.deletePublic(tag.id);
      } else {
        await tagsApi.deleteInternal(tag.id);
      }
      loadData();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  // User management
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
              <h1 className="text-3xl font-bold text-gray-900">Панель администратора</h1>
              <p className="text-gray-600 mt-1">Управление системой обращений</p>
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

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { id: 'dashboard', label: 'Статистика' },
              { id: 'categories', label: 'Управление категориями' },
              { id: 'users', label: 'Управление пользователями' },
              { id: 'settings', label: 'Настройки системы' },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
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
            >
              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="card">
                  <p className="text-sm text-gray-600">Всего обращений</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_appeals}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600">Новые</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.new_appeals}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600">В работе</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.in_progress_appeals}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600">Решённые</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved_appeals}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600">Отклонённые</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected_appeals}</p>
                </div>
              </div>

              {/* Average resolution time */}
              <div className="card mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Среднее время обработки обращения</h3>
                <p className="text-2xl text-primary font-semibold">
                  {formatResolutionTime(stats.average_resolution_time)}
                </p>
                <p className="text-sm text-gray-500 mt-1">от создания до завершения</p>
              </div>

              {/* Tag statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Публичные теги (категории)</h3>
                  {stats.public_tag_stats.length > 0 ? (
                    <div className="space-y-3">
                      {stats.public_tag_stats.map((tag) => (
                        <div key={tag.tag_id} className="flex items-center justify-between">
                          <span className="text-gray-700">{tag.tag_name}</span>
                          <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                            {tag.count} обращений
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Нет тегов</p>
                  )}
                </div>

                <div className="card">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Внутренние теги</h3>
                  {stats.internal_tag_stats.length > 0 ? (
                    <div className="space-y-3">
                      {stats.internal_tag_stats.map((tag) => (
                        <div key={tag.tag_id} className="flex items-center justify-between">
                          <span className="text-gray-700">{tag.tag_name}</span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {tag.count} обращений
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Нет тегов</p>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="card mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Быстрые действия</h3>
                <button
                  onClick={() => window.location.href = '/moderator'}
                  className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-left font-medium"
                >
                  Перейти к обращениям
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Categories section */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Категории обращений</h3>
                <form onSubmit={handleCreateCategory} className="flex gap-4 mb-6">
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Название категории"
                    className="input-field flex-1"
                    required
                  />
                  <select
                    value={newCategory.parent_id}
                    onChange={(e) => setNewCategory({ ...newCategory, parent_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Родительская категория</option>
                    {flattenCategories(categories).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary">Добавить</button>
                </form>

                <div className="space-y-2">
                  {flattenCategories(categories).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      {editingCategory?.id === cat.id ? (
                        <form onSubmit={handleUpdateCategory} className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="input-field flex-1"
                          />
                          <button type="submit" className="btn-primary">Сохранить</button>
                          <button type="button" onClick={() => setEditingCategory(null)} className="btn-secondary">Отмена</button>
                        </form>
                      ) : (
                        <>
                          <span>{cat.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const original = categories.find(c => c.id === cat.id) || 
                                  flattenCategories(categories).find(c => c.id === cat.id);
                                if (original) setEditingCategory(original as Category);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Удалить
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags section */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Теги</h3>
                <form onSubmit={handleCreateTag} className="flex gap-4 mb-6">
                  <input
                    type="text"
                    value={newTag.name}
                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    placeholder="Название тега"
                    className="input-field flex-1"
                    required
                  />
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <select
                    value={newTag.is_public ? 'public' : 'internal'}
                    onChange={(e) => setNewTag({ ...newTag, is_public: e.target.value === 'public' })}
                    className="input-field"
                  >
                    <option value="public">Публичный</option>
                    <option value="internal">Внутренний</option>
                  </select>
                  <button type="submit" className="btn-primary">Добавить</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Публичные теги</h4>
                    <div className="space-y-2">
                      {tags.filter(t => t.is_public).map((tag) => (
                        <div key={tag.id} className="flex items-center justify-between p-2 bg-primary-50 rounded">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: tag.color || '#00C9C8' }}></span>
                            {tag.name}
                          </span>
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Внутренние теги</h4>
                    <div className="space-y-2">
                      {tags.filter(t => !t.is_public).map((tag) => (
                        <div key={tag.id} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: tag.color || '#6B7280' }}></span>
                            {tag.name}
                          </span>
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">Управление пользователями</h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Имя пользователя"
                  className="input-field"
                  required
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Email"
                  className="input-field"
                  required
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Пароль"
                  className="input-field"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'moderator' })}
                  className="input-field"
                >
                  <option value="moderator">Модератор</option>
                  <option value="admin">Администратор</option>
                </select>
                <button type="submit" className="btn-primary">Добавить</button>
              </form>

              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    {editingUser?.id === user.id ? (
                      <form onSubmit={handleUpdateUser} className="flex gap-2 flex-1 items-center">
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="input-field"
                        />
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="input-field"
                        />
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'moderator' })}
                          className="input-field"
                        >
                          <option value="moderator">Модератор</option>
                          <option value="admin">Администратор</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingUser.is_active}
                            onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                          />
                          Активен
                        </label>
                        <button type="submit" className="btn-primary">Сохранить</button>
                        <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">Отмена</button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Администратор' : 'Модератор'}
                          </span>
                          {!user.is_active && (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Неактивен</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
              className="card"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Настройки системы</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название системы
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    defaultValue='Обращения к партии "Новые Люди"'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email для уведомлений
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="autoAssign" className="w-4 h-4" />
                  <label htmlFor="autoAssign" className="text-sm text-gray-700">
                    Автоматическое назначение модератора
                  </label>
                </div>
                <button className="btn-primary">Сохранить настройки</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
