import type { Metadata } from 'next';
import { Navigation } from "@/components/ui/Navigation";

// Force dynamic rendering — ensures middleware always runs for dashboard routes.
// Without this, Next.js statically pre-renders these pages and bypasses the
// session cookie check in middleware.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard - Frañol',
  description: 'Tableau de bord pour gérer votre apprentissage bilingue',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-franol-cream overflow-x-hidden">
      <Navigation />
      <main className="pb-20 md:pb-0 md:pl-64 overflow-x-hidden">{children}</main>
    </div>
  );
}
