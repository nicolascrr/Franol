'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Navigation } from '@/components/ui/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const router = useRouter();

  // Rediriger vers l'accueil si pas de locale
  useEffect(() => {
    if (!locale) {
      router.push('/');
    }
  }, [locale, router]);

  // Ne rien afficher si pas de locale (évite le flash)
  if (!locale) {
    return null;
  }

  return (
    <div className="min-h-screen bg-franol-cream">
      <Navigation />
      <main className="pb-20 md:pb-0 md:pl-64">
        {children}
      </main>
    </div>
  );
}
