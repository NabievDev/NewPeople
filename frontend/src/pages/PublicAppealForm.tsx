import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import CategorySelector from '../components/CategorySelector';
import FileUpload from '../components/FileUpload';
import { appealsApi } from '../services/api';
import type { AppealCreate, TelegramUser } from '../types';
import logoImage from '../assets/logo.png';

const PublicAppealForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

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

  const isTelegramWebApp = !!telegramWebApp && !!telegramUser;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<Omit<AppealCreate, 'attachment' | 'category_id' | 'is_anonymous'>>();

  useEffect(() => {
    if (telegramWebApp) {
      telegramWebApp.ready();
      telegramWebApp.expand();
      
      if (telegramWebApp.themeParams.bg_color) {
        document.body.style.backgroundColor = telegramWebApp.themeParams.bg_color;
      }
    }
  }, [telegramWebApp]);

  useEffect(() => {
    if (telegramUser) {
      const fullName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
      setValue('author_name', fullName);
    }
  }, [telegramUser, setValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
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
        telegram_user_id: telegramUser?.id,
        telegram_username: telegramUser?.username,
      };

      await appealsApi.create(appealData);
      
      if (telegramWebApp) {
        telegramWebApp.HapticFeedback.notificationOccurred('success');
      }
      
      setStep('success');
      reset();
      setSelectedFile(null);
      setSelectedCategory(undefined);
      setIsAnonymous(false);
      setConsentGiven(false);
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      if (telegramWebApp) {
        telegramWebApp.HapticFeedback.notificationOccurred('error');
      }
      alert('Произошла ошибка при отправке обращения. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep('category');
    setSelectedCategory(undefined);
    setIsAnonymous(false);
    setConsentGiven(false);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative py-8 md:py-12 px-4">
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
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="Новые Люди" 
                  className="w-20 h-20 md:w-24 md:h-24 object-contain"
                />
                <motion.div
                  className="absolute -inset-2 rounded-full border-2 border-primary/20"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </motion.div>
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Обращение к партии
            </motion.h1>
            <motion.div
              className="flex items-center justify-center gap-2 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50"></div>
              <span className="text-primary font-semibold text-lg">"Новые Люди"</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50"></div>
            </motion.div>
            <motion.p 
              className="text-gray-600 text-lg max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Мы готовы выслушать и помочь решить вашу проблему
            </motion.p>
          </motion.div>

          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-lg shadow-primary/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      Выберите категорию
                    </h2>
                    <p className="text-sm text-gray-500">Шаг 1 из 2</p>
                  </div>
                </div>
                <CategorySelector onSelect={handleCategorySelect} selectedId={selectedCategory} />
              </motion.div>
            )}

            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100"
              >
                <button
                  onClick={() => setStep('category')}
                  className="group flex items-center gap-2 text-primary hover:text-primary-700 transition-colors mb-6"
                >
                  <motion.span
                    className="inline-block"
                    whileHover={{ x: -3 }}
                  >
                    ←
                  </motion.span>
                  <span className="group-hover:underline">Изменить категорию</span>
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-lg shadow-primary/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                      Заполните форму
                    </h2>
                    <p className="text-sm text-gray-500">Шаг 2 из 2</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <motion.div
                    className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-6 h-6 rounded-lg border-2 border-primary/30 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                          {isAnonymous && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Подать обращение анонимно</span>
                        <p className="text-sm text-gray-500">Ваши личные данные не будут сохранены</p>
                      </div>
                    </label>
                  </motion.div>

                  <AnimatePresence>
                    {!isAnonymous && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-5 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ФИО <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('author_name', {
                              required: !isAnonymous && 'Укажите ваше ФИО',
                            })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder-gray-400"
                            placeholder="Иванов Иван Иванович"
                          />
                          {errors.author_name && (
                            <motion.p 
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-500 text-sm mt-2 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {errors.author_name.message}
                            </motion.p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder-gray-400"
                              placeholder="example@mail.ru"
                            />
                            {errors.email && (
                              <motion.p 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-sm mt-2"
                              >
                                {errors.email.message}
                              </motion.p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Телефон
                            </label>
                            <input
                              {...register('phone')}
                              type="tel"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder-gray-400"
                              placeholder="+7 (999) 123-45-67"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Описание проблемы <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('text', { required: 'Опишите вашу проблему' })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white text-gray-900 placeholder-gray-400 resize-none"
                      rows={6}
                      placeholder="Подробно опишите вашу проблему или предложение..."
                    />
                    {errors.text && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-2 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.text.message}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Приложить файл <span className="text-gray-400 font-normal">(необязательно)</span>
                    </label>
                    <FileUpload onFileSelect={setSelectedFile} selectedFile={selectedFile} />
                  </div>

                  <AnimatePresence>
                    {!isAnonymous && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-6 h-6 rounded-lg border-2 border-primary/30 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                                {consentGiven && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                Я согласен на{' '}
                                <a
                                  href="https://google.com"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-700 underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  обработку персональных данных
                                </a>
                              </span>
                            </div>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <motion.button 
                      type="submit" 
                      disabled={isSubmitting || (!isAnonymous && !consentGiven)} 
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: (isSubmitting || (!isAnonymous && !consentGiven)) ? 1 : 1.02 }}
                      whileTap={{ scale: (isSubmitting || (!isAnonymous && !consentGiven)) ? 1 : 0.98 }}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Отправка...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Отправить обращение
                        </span>
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleStartOver}
                      className="px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Отмена
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mx-auto w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-green-500/30"
                >
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
                <motion.h2 
                  className="text-2xl md:text-3xl font-bold text-gray-900 mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Обращение отправлено!
                </motion.h2>
                <motion.p 
                  className="text-gray-600 text-lg mb-8 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Спасибо за ваше обращение. Мы рассмотрим его в ближайшее время и примем необходимые меры.
                </motion.p>
                <motion.button 
                  onClick={handleStartOver} 
                  className="px-8 py-4 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Подать новое обращение
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-400">
              Партия "Новые Люди" &copy; {new Date().getFullYear()}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PublicAppealForm;
