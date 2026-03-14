import type { Metadata } from 'next';
import { DiscoveryContent } from "@/components/practice/DiscoveryContent";

export const metadata: Metadata = {
  title: 'Mode Découverte IA - Frañol',
  description: 'Créez des quiz personnalisés avec l\'intelligence artificielle',
};

export default function DiscoveryPage() {
  return <DiscoveryContent />;
}
