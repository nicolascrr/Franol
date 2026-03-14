"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { FlagTicker } from "@/components/home/FlagTicker";
import { LanguageButton } from "@/components/home/LanguageButton";

export default function HomePage() {
  const router = useRouter();
  const { setLocale } = useLocale();
  const [loadingPortal, setLoadingPortal] = useState<"fr" | "es" | null>(null);
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

  const handleSelectPortal = async (locale: "fr" | "es") => {
    setLoadingPortal(locale);
    setLocale(locale);

    // Récupérer l'URL de redirection si elle existe
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get("redirect") || "/dashboard";

    // Vérifier si déjà authentifié avant de rediriger vers login
    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();

      if (data.authenticated) {
        // Si déjà authentifié, rediriger vers la page demandée
        router.push(redirectUrl);
      } else {
        // Sinon, aller vers la page de login avec l'URL de redirection
        const loginUrl =
          redirectUrl !== "/dashboard"
            ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
            : "/login";
        router.push(loginUrl);
      }
    } catch (error) {
      // En cas d'erreur, rediriger vers login par défaut
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header avec logo */}
      <header className="pt-8 pb-4 text-center animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-franol-text tracking-tight">
          Fran
          <span className="text-franol-accent-blue">̃</span>
          ol
        </h1>
        <p className="mt-2 text-franol-muted text-sm tracking-widest uppercase">
          Français • Español
        </p>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {/* Question bilingue */}
        <div
          className="text-center mb-12 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-2xl md:text-3xl font-display text-franol-text leading-relaxed">
            <span className="block">¿Qué quieres aprender?</span>
            <span className="block text-franol-muted mt-1">
              Que veux-tu apprendre ?
            </span>
          </h2>
        </div>

        {/* Boutons de sélection */}
        <div
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-16 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {/* Francophone qui veut apprendre l'espagnol → Interface française */}
          <LanguageButton
            variant="spanish"
            onClick={() => handleSelectPortal("fr")}
            isLoading={loadingPortal === "fr"}
            disabled={loadingPortal !== null}
          >
            Apprendre l'espagnol
          </LanguageButton>

          {/* Hispanophone qui veut apprendre le français → Interface espagnole */}
          <LanguageButton
            variant="french"
            onClick={() => handleSelectPortal("es")}
            isLoading={loadingPortal === "es"}
            disabled={loadingPortal !== null}
          >
            Aprender el francés
          </LanguageButton>
        </div>

        {/* Ticker de drapeaux */}
        <div
          className="w-full max-w-4xl animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          <FlagTicker />
        </div>
      </div>

      {/* Footer discret */}
      <footer className="py-6 text-center">
        <p className="text-franol-muted text-xs">
          © Fait par Nicolas • v{version}
        </p>
      </footer>
    </main>
  );
}
