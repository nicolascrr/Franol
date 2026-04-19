"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base sizing: 44px touch target via padding, visible box is w-5 h-5
          "relative flex items-center justify-center",
          "w-[44px] h-[44px] p-[12px]",
          // Focus ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-franol-accent-blue/30 focus-visible:ring-offset-0",
          "rounded-lg",
          // Remove default button styles
          "bg-transparent border-0",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span
          className={cn(
            // Checkbox box
            "w-5 h-5 rounded-md flex items-center justify-center",
            "border-2 transition-all duration-200",
            // Inner shadow for depth
            !checked && "bg-white border-franol-warm shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
            !checked && !disabled && "hover:shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),0_0_0_3px_rgba(30,58,138,0.08)]",
            checked && "bg-franol-accent-blue border-franol-accent-blue",
            disabled && "opacity-50"
          )}
        >
          <Check
            size={14}
            className={cn(
              "text-white transition-transform duration-200 origin-center",
              checked ? "scale-100" : "scale-0"
            )}
            strokeWidth={3}
          />
        </span>
      </button>

      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-franol-text select-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => {
            // Prevent double-toggle since the parent div already handles click
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }}
        >
          {label}
        </label>
      )}
    </div>
  );
}
