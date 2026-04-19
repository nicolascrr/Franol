import type { Metadata } from 'next';
import { Navigation } from "@/components/ui/Navigation";

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
