"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { Home } from "lucide-react";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-franol-cream flex items-center justify-center p-6">
      <div className="text-center max-w-md animate-fade-in">
        {/* 404 number */}
        <h1 className="text-8xl md:text-9xl font-display font-bold text-franol-warm">
          404
        </h1>

        {/* Message */}
        <p className="mt-4 text-xl md:text-2xl font-display font-semibold text-franol-text">
          {t("") ? t("notFound.title") : "Page not found"}
        </p>
        <p className="mt-2 text-franol-muted">
          {t("")
            ? t("notFound.description")
            : "The page you are looking for does not exist or has been moved."}
        </p>

        {/* Home button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3
                     bg-franol-accent-blue text-white font-medium rounded-xl
                     hover:bg-blue-700 transition-colors active:scale-[0.98]"
        >
          <Home size={18} />
          {t("") ? t("notFound.home") : "Go back to home"}
        </Link>
      </div>
    </div>
  );
}
