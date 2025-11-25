import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categoriesApi } from '../services/api';
import type { Category } from '../types';

interface CategorySelectorProps {
  onSelect: (categoryId: number) => void;
  selectedId?: number;
}

interface CategoryWithChildren extends Category {
  subcategories?: CategoryWithChildren[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect, selectedId }) => {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<CategoryWithChildren[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithChildren | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: CategoryWithChildren) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setBreadcrumb([...breadcrumb, category]);
    } else {
      setSelectedCategory(category);
      onSelect(category.id);
      setIsOpen(false);
      setBreadcrumb([]);
    }
  };

  const handleBackClick = () => {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      setBreadcrumb(newBreadcrumb);
    }
  };

  const getCurrentLevel = (): CategoryWithChildren[] => {
    if (breadcrumb.length === 0) {
      return categories.filter(cat => !cat.parent_id);
    }
    const lastCategory = breadcrumb[breadcrumb.length - 1];
    return lastCategory.subcategories || [];
  };

  const getDisplayText = () => {
    if (selectedCategory) {
      const path = [...breadcrumb.filter(c => c.id !== selectedCategory.id), selectedCategory];
      return path.map(c => c.name).join(' → ');
    }
    return 'Выберите категорию обращения';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentLevel = getCurrentLevel();

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 text-left border-2 rounded-lg transition-all ${
          selectedCategory
            ? 'border-primary bg-primary-50 text-gray-900'
            : 'border-gray-300 bg-white text-gray-600 hover:border-primary'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center justify-between">
          <span className={selectedCategory ? 'font-medium' : ''}>
            {getDisplayText()}
          </span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto"
          >
            {breadcrumb.length > 0 && (
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-3">
                <button
                  onClick={handleBackClick}
                  className="flex items-center space-x-2 text-primary hover:text-primary-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="text-sm font-medium">Назад</span>
                </button>
                <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                  <span>Путь:</span>
                  <span className="font-medium">
                    {breadcrumb.map(c => c.name).join(' → ')}
                  </span>
                </div>
              </div>
            )}

            <div className="p-2">
              {currentLevel.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="w-full px-4 py-3 text-left rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-between group"
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-gray-600 mt-1">
                        {category.description}
                      </div>
                    )}
                  </div>
                  {category.subcategories && category.subcategories.length > 0 ? (
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategorySelector;
