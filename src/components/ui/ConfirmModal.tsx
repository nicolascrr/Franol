"use client";

import { ReactNode } from "react";
import { Loader2, AlertTriangle, Trash2, Info } from "lucide-react";

type ModalVariant = "danger" | "warning" | "info";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
  variant?: ModalVariant;
  preview?: ReactNode;
}

const variantStyles: Record<
  ModalVariant,
  {
    iconBg: string;
    iconColor: string;
    buttonBg: string;
    buttonHover: string;
    Icon: typeof Trash2;
  }
> = {
  danger: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    buttonBg: "bg-red-600",
    buttonHover: "hover:bg-red-700",
    Icon: Trash2,
  },
  warning: {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    buttonBg: "bg-amber-600",
    buttonHover: "hover:bg-amber-700",
    Icon: AlertTriangle,
  },
  info: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    buttonBg: "bg-blue-600",
    buttonHover: "hover:bg-blue-700",
    Icon: Info,
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  variant = "danger",
  preview,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="p-6 text-center">
          <div
            className={`mx-auto w-14 h-14 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}
          >
            <Icon className={`w-7 h-7 ${styles.iconColor}`} />
          </div>
          <h2 className="text-xl font-display font-bold text-franol-text mb-2">
            {title}
          </h2>
          <p className="text-franol-muted">{message}</p>

          {/* Aperçu optionnel */}
          {preview && (
            <div className="mt-4 p-3 bg-franol-sand rounded-xl">{preview}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-6 py-3 rounded-xl font-medium text-franol-text
                       bg-franol-sand hover:bg-franol-warm
                       disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-6 py-3 rounded-xl font-medium text-white
                       ${styles.buttonBg} ${styles.buttonHover}
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
