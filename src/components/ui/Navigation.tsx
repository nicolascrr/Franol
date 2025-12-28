'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { 
  Home, 
  PlusCircle, 
  Dumbbell, 
  BookOpen,
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'home', href: '/dashboard', icon: Home },
  { key: 'add', href: '/dashboard/add', icon: PlusCircle },
  { key: 'practice', href: '/dashboard/practice', icon: Dumbbell },
  { key: 'lessons', href: '/dashboard/lessons', icon: BookOpen },
];

export function Navigation() {
  const { t, clearLocale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearLocale();
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Navigation desktop - Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-franol-warm flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-franol-warm">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-franol-text">
              Fran<span className="text-franol-accent-blue">̃</span>ol
            </span>
          </Link>
          <p className="text-xs text-franol-muted mt-1">
            {t('dashboard.portalName')}
          </p>
        </div>

        {/* Menu items */}
        <div className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 mx-2 rounded-xl transition-all',
                  active 
                    ? 'bg-franol-accent-blue text-white' 
                    : 'text-franol-muted hover:bg-franol-sand hover:text-franol-text'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-franol-warm">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl
                       text-franol-muted hover:bg-red-50 hover:text-red-600
                       transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('auth.logout')}</span>
          </button>
        </div>
      </nav>

      {/* Navigation mobile - Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-franol-warm z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                  active 
                    ? 'text-franol-accent-blue' 
                    : 'text-franol-muted'
                )}
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
