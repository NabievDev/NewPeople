import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categoriesApi } from '../services/api';
import type { Category } from '../types';

interface CategorySelectorProps {
  onSelect: (categoryId: number) => void;
  selectedId?: number;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect, selectedId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Category[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
      const rootCategories = data.filter(cat => !cat.parent_id);
      setCurrentLevel(rootCategories);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: Category) => {
    const children = categories.filter(cat => cat.parent_id === category.id);
    
    if (children.length > 0) {
      setBreadcrumb([...breadcrumb, category]);
      setCurrentLevel(children);
    } else {
      onSelect(category.id);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setBreadcrumb([]);
      setCurrentLevel(categories.filter(cat => !cat.parent_id));
    } else {
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      const lastCategory = newBreadcrumb[newBreadcrumb.length - 1];
      const children = categories.filter(cat => cat.parent_id === lastCategory.id);
      setBreadcrumb(newBreadcrumb);
      setCurrentLevel(children);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {breadcrumb.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm"
        >
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="text-primary hover:text-primary-700 transition-colors"
          >
            Главная
          </button>
          {breadcrumb.map((cat, index) => (
            <React.Fragment key={cat.id}>
              <span className="text-gray-400">/</span>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="text-primary hover:text-primary-700 transition-colors"
              >
                {cat.name}
              </button>
            </React.Fragment>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {currentLevel.map((category) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategoryClick(category)}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                selectedId === category.id
                  ? 'border-primary bg-primary-50'
                  : 'border-gray-200 hover:border-primary hover:shadow-md'
              }`}
            >
              <div className="font-semibold text-gray-900">{category.name}</div>
              {category.description && (
                <div className="text-sm text-gray-600 mt-1">{category.description}</div>
              )}
              {categories.some(cat => cat.parent_id === category.id) && (
                <div className="text-xs text-primary mt-2">→ Подкатегории</div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {breadcrumb.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => handleBreadcrumbClick(breadcrumb.length - 2)}
          className="text-primary hover:text-primary-700 flex items-center space-x-1"
        >
          <span>←</span>
          <span>Назад</span>
        </motion.button>
      )}
    </div>
  );
};

export default CategorySelector;
