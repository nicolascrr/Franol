'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  PlusCircle, 
  Dumbbell, 
  BookOpen,
  TrendingUp,
  Target,
  Clock,
  LogOut
} from 'lucide-react';

export default function DashboardPage() {
  const { t, clearLocale } = useLocale();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearLocale();
    router.push('/');
  };

  const quickActions = [
    {
      titleKey: 'addVocabulary',
      descKey: 'addVocabularyDesc',
      href: '/dashboard/add',
      icon: PlusCircle,
      color: 'bg-emerald-500',
    },
    {
      titleKey: 'practice',
      descKey: 'practiceDesc',
      href: '/dashboard/practice',
      icon: Dumbbell,
      color: 'bg-blue-500',
    },
    {
      titleKey: 'viewLessons',
      descKey: 'viewLessonsDesc',
      href: '/dashboard/lessons',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-franol-text">
          {t('dashboard.welcome')}
        </h1>
        <p className="mt-2 text-franol-muted">
          {t('dashboard.subtitle')}
        </p>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <Target className="w-5 h-5 text-franol-accent-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0</p>
              <p className="text-sm text-franol-muted">
                {t('dashboard.wordsLearned')}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0%</p>
              <p className="text-sm text-franol-muted">
                {t('dashboard.successRate')}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-2xl p-5 border border-franol-warm animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-franol-sand">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-franol-text">0</p>
              <p className="text-sm text-franol-muted">
                {t('dashboard.quizCompleted')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <h2 className="text-xl font-display font-semibold text-franol-text mb-4">
        {t('dashboard.quickActions')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group bg-white rounded-2xl p-6 border border-franol-warm
                         hover:border-franol-accent-blue hover:shadow-lg
                         transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className={`inline-flex p-3 rounded-xl ${action.color} mb-4
                              group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-franol-text mb-1">
                {t(`dashboard.${action.titleKey}`)}
              </h3>
              <p className="text-sm text-franol-muted">
                {t(`dashboard.${action.descKey}`)}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Bouton déconnexion - Mobile uniquement */}
      <div 
        className="mt-8 md:hidden animate-fade-in"
        style={{ animationDelay: '0.6s' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 
                     bg-white border border-franol-warm rounded-2xl
                     text-red-600 hover:bg-red-50 hover:border-red-200
                     transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">{t('auth.logout')}</span>
        </button>
      </div>
    </div>
  );
}
