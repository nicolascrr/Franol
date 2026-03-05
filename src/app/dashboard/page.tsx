import type { Metadata } from 'next';
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: 'Accueil - Dashboard - Frañol',
  description: 'Votre tableau de bord d\'apprentissage bilingue français-espagnol',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
