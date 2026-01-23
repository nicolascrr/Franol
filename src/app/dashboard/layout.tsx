"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { Navigation } from "@/components/ui/Navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, isLoading } = useLocale();
  const router = useRouter();

  // Rediriger vers l'accueil si pas de locale (mais seulement après le chargement)
  useEffect(() => {
    if (!isLoading && !locale) {
      router.push("/");
    }
  }, [locale, isLoading, router]);

  // Ne rien afficher pendant le chargement ou si pas de locale
  if (isLoading || !locale) {
    return null;
  }

  return (
    <div className="min-h-screen bg-franol-cream">
      <Navigation />
      <main className="pb-20 md:pb-0 md:pl-64">{children}</main>
    </div>
  );
}
