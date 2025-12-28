import type { Metadata } from 'next';
import { LocaleProvider } from '@/contexts/LocaleContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Frañol - Apprendre le français et l\'espagnol',
  description: 'Application bilingue pour apprendre le français et l\'espagnol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-franol-cream">
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
