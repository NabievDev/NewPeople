import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import CategorySelector from '../components/CategorySelector';
import FileUpload from '../components/FileUpload';
import { appealsApi } from '../services/api';
import type { AppealCreate } from '../types';
import logoImage from '../assets/logo.png';

const PublicAppealForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Omit<AppealCreate, 'attachment' | 'category_id' | 'is_anonymous'>>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setStep('form');
  };

  const onSubmit = async (data: Omit<AppealCreate, 'attachment' | 'category_id' | 'is_anonymous'>) => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const appealData: AppealCreate = {
        author_name: data.author_name,
        email: data.email,
        phone: data.phone,
        text: data.text,
        category_id: selectedCategory,
        is_anonymous: isAnonymous,
        attachment: selectedFile || undefined,
      };

      await appealsApi.create(appealData);
      setStep('success');
      reset();
      setSelectedFile(null);
      setSelectedCategory(undefined);
      setIsAnonymous(false);
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      alert('Произошла ошибка при отправке обращения. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep('category');
    setSelectedCategory(undefined);
    setIsAnonymous(false);
    reset();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <img 
              src={logoImage} 
              alt="Новые Люди" 
              className="w-32 h-32 object-contain"
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary"
              animate={{ 
                scale: [1, 1.3, 1.3],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <img 
              src={logoImage} 
              alt="Новые Люди" 
              className="w-24 h-24 object-contain"
            />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Обращение к партии "Новые Люди"
          </h1>
          <p className="text-gray-600">
            Мы готовы выслушать и помочь решить вашу проблему
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card overflow-visible"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Выберите категорию обращения
              </h2>
              <CategorySelector onSelect={handleCategorySelect} selectedId={selectedCategory} />
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card"
            >
              <button
                onClick={() => setStep('category')}
                className="text-primary hover:text-primary-700 flex items-center space-x-1 mb-4"
              >
                <span>←</span>
                <span>Изменить категорию</span>
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Заполните форму обращения
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Подать обращение анонимно
                    </span>
                  </label>
                </div>

                {!isAnonymous && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ФИО *
                      </label>
                      <input
                        {...register('author_name', {
                          required: !isAnonymous && 'Укажите ваше ФИО',
                        })}
                        className="input-field"
                        placeholder="Иванов Иван Иванович"
                      />
                      {errors.author_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.author_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        {...register('email', {
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Некорректный email',
                          },
                        })}
                        type="email"
                        className="input-field"
                        placeholder="example@mail.ru"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Телефон
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="input-field"
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание проблемы *
                  </label>
                  <textarea
                    {...register('text', { required: 'Опишите вашу проблему' })}
                    className="input-field"
                    rows={8}
                    placeholder="Подробно опишите вашу проблему или предложение..."
                  />
                  {errors.text && (
                    <p className="text-red-500 text-sm mt-1">{errors.text.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Приложить файл (необязательно)
                  </label>
                  <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
                </div>

                <div className="flex space-x-4">
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Отправка...' : 'Отправить обращение'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="btn-secondary"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
              >
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Обращение отправлено!
              </h2>
              <p className="text-gray-600 mb-6">
                Спасибо за ваше обращение. Мы рассмотрим его в ближайшее время.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={handleStartOver} className="btn-primary">
                  Подать новое обращение
                </button>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="btn-secondary"
                >
                  Войти в систему
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <button 
            onClick={() => window.location.href = '/login'}
            className="text-sm text-gray-500 hover:text-primary transition-colors"
          >
            Вход для модераторов
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicAppealForm;
