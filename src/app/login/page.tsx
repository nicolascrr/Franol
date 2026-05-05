"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { Lock, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { locale, t, clearLocale, isLoading: localeLoading } = useLocale();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si l'utilisateur est déjà authentifié (after locale is loaded)
  useEffect(() => {
    if (localeLoading) return;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();

        if (data.authenticated) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Erreur vérification auth:", error);
      }
    };

    // Only redirect to home if locale is confirmed absent (not just unloaded)
    if (!locale) {
      router.push("/");
      return;
    }

    checkAuth();
  }, [locale, localeLoading, router]);

  const handleBack = () => {
    clearLocale();
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Récupérer l'URL de redirection depuis les paramètres
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        // Ne pas remettre isLoading à false, la navigation va démonter le composant
        router.push(redirectUrl);
      } else {
        setError(t("auth.incorrect"));
        setIsLoading(false);
      }
    } catch (err) {
      setError(t("common.error"));
      setIsLoading(false);
    }
  };

  // Attendre le chargement de la locale depuis localStorage
  if (localeLoading || !locale) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-franol-cream">
      {/* Bouton retour */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-franol-muted
                   hover:text-franol-text transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm">{t("common.back")}</span>
      </button>

      {/* Card de login */}
      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full
                          bg-franol-sand mb-4"
          >
            <Lock className="w-8 h-8 text-franol-text" />
          </div>
          <h1 className="text-2xl font-display font-bold text-franol-text">
            {t("auth.title")}
          </h1>
          <p className="mt-2 text-franol-muted text-sm">{t("auth.subtitle")}</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password")}
              className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-franol-warm
                         bg-white text-franol-text placeholder-franol-muted
                         focus:border-franol-accent-blue focus:outline-none
                         transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-franol-muted
                         hover:text-franol-text transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center animate-fade-in">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 px-4 rounded-xl font-medium text-white
                       bg-gradient-to-r from-franol-accent-blue to-blue-700
                       hover:from-blue-700 hover:to-franol-accent-blue
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 transform hover:scale-[1.02]
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t("auth.connecting")}</span>
              </>
            ) : (
              <span>{t("auth.enter")}</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-12 text-franol-muted text-xs">
        Frañol • {t("dashboard.portalName")}
      </p>
    </main>
  );
}
