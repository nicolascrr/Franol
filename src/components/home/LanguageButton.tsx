"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageButtonProps {
  variant: "french" | "spanish";
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function LanguageButton({
  variant,
  children,
  onClick,
  className,
  isLoading = false,
  disabled = false,
}: LanguageButtonProps) {
  const styles = {
    french: {
      bg: "bg-gradient-to-br from-blue-600 to-blue-800",
      hover: "hover:from-blue-500 hover:to-blue-700",
      shadow: "shadow-blue-500/25",
      ring: "focus:ring-blue-500",
      text: "text-white",
    },
    spanish: {
      bg: "bg-gradient-to-br from-sky-400 to-sky-500",
      hover: "hover:from-sky-300 hover:to-sky-400",
      shadow: "shadow-sky-500/25",
      ring: "focus:ring-sky-400",
      text: "text-white",
    },
  };

  const style = styles[variant];
  const isDisabled = isLoading || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "btn-primary",
        style.text,
        style.bg,
        style.hover,
        `shadow-lg ${style.shadow}`,
        `focus:outline-none focus:ring-4 ${style.ring} focus:ring-opacity-50`,
        "min-w-[220px]",
        isDisabled && "opacity-70 cursor-not-allowed",
        className,
      )}
    >
      <span className="relative z-10 flex items-center justify-center gap-3">
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            {variant === "french" && <span className="text-2xl">🇫🇷</span>}
            {variant === "spanish" && <span className="text-2xl">🇦🇷</span>}
          </>
        )}
        <span>{children}</span>
      </span>
    </button>
  );
}
