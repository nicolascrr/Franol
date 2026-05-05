"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "warning" | "info" | "success";

interface AlertPopupProps {
  /** Whether the alert is visible */
  show: boolean;
  /** Variant determines color and icon */
  variant: AlertVariant;
  /** Message text */
  message: string;
  /** Optional title */
  title?: string;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  duration?: number;
  /** Show dark blue border timer that traces the perimeter */
  showTimer?: boolean;
  /** Callback when alert is dismissed */
  onClose: () => void;
}

const variantConfig: Record<
  AlertVariant,
  {
    icon: typeof AlertTriangle;
    bg: string;
    border: string;
    iconColor: string;
    textColor: string;
    titleColor: string;
  }
> = {
  warning: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-500",
    textColor: "text-red-700",
    titleColor: "text-red-800",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
    textColor: "text-blue-700",
    titleColor: "text-blue-800",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconColor: "text-emerald-500",
    textColor: "text-emerald-700",
    titleColor: "text-emerald-800",
  },
};

export function AlertPopup({
  show,
  variant,
  message,
  title,
  duration = 0,
  showTimer = false,
  onClose,
}: AlertPopupProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [perimeter, setPerimeter] = useState(1000);

  // Measure the container to calculate SVG rect perimeter
  useEffect(() => {
    if (showTimer && show && containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      const w = offsetWidth;
      const h = offsetHeight;
      // Perimeter of a rounded rect ≈ 2*(w+h) for large radii
      // More precise: 2*(w-2r) + 2*(h-2r) + 2*π*r where r=16
      const r = 16;
      const p = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
      setPerimeter(Math.round(p));
    }
  }, [showTimer, show]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(onClose, 300); // wait for animation
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [show, duration, onClose]);

  if (!show && !visible) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const timerDuration = Math.max(duration || 5000, 3000);

  return (
    <div
      className={cn(
        "fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 md:max-w-md md:w-full z-[60]",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "rounded-2xl p-4 shadow-lg relative",
          config.bg,
          showTimer ? "alert-timer-border" : `border ${config.border}`,
        )}
        style={showTimer ? {
          "--timer-duration": `${timerDuration}ms`,
          "--timer-perimeter": `${perimeter}`,
        } as React.CSSProperties : undefined}
      >
        {showTimer && (
          <svg className="alert-timer-svg" aria-hidden="true">
            <rect
              x="1"
              y="1"
              width={containerRef.current ? containerRef.current.offsetWidth - 2 : "100%"}
              height={containerRef.current ? containerRef.current.offsetHeight - 2 : "100%"}
              style={{
                strokeDasharray: perimeter,
                strokeDashoffset: 0,
                animationDuration: `${timerDuration}ms`,
              }}
            />
          </svg>
        )}
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
          <div className="flex-1 min-w-0">
            {title && (
              <p className={cn("text-sm font-semibold mb-1", config.titleColor)}>
                {title}
              </p>
            )}
            <p className={cn("text-sm", config.textColor)}>{message}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            className={cn(
              "p-1 rounded-lg shrink-0 transition-colors",
              config.textColor,
              "hover:bg-black/5",
            )}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
