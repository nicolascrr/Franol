"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomDropdownOption {
  value: string;
  label: string;
  color?: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  placeholder: string;
  label?: string;
  className?: string;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  label,
  className,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Calculate dropdown position — viewport-relative (fixed positioning)
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const gap = 6;

      let left = rect.left;
      const rightEdge = left + rect.width;
      if (rightEdge > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - rect.width - 8);
      }

      setDropdownPosition({
        top: rect.bottom + gap,
        left,
        width: rect.width,
      });
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);

      if (!clickedInsideContainer && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Update position on open and scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollResize = () => {
        updatePosition();
      };

      window.addEventListener("scroll", handleScrollResize, true);
      window.addEventListener("resize", handleScrollResize);

      return () => {
        window.removeEventListener("scroll", handleScrollResize, true);
        window.removeEventListener("resize", handleScrollResize);
      };
    }
  }, [isOpen, updatePosition]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-franol-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Trigger button - consistent border-2 to prevent layout shift */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-xl text-sm text-left",
            "flex items-center justify-between gap-2",
            "transition-colors duration-200 ease-out",
            "border-2 shadow-sm",
            isOpen
              ? "border-franol-accent-blue bg-white shadow-md"
              : "border-franol-warm/60 bg-white hover:border-franol-warm hover:shadow-md",
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 truncate">
            {selectedOption?.color && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            <span
              className={cn(
                "truncate font-medium",
                selectedOption ? "text-franol-text" : "text-franol-muted/70",
              )}
            >
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              "flex-shrink-0 transition-all duration-200",
              isOpen
                ? "rotate-180 text-franol-accent-blue"
                : "text-franol-muted/60",
            )}
          />
        </button>

        {/* Dropdown menu rendered via portal */}
        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 9999,
              }}
              className={cn(
                "z-[9999] py-1.5 rounded-xl border border-franol-warm",
                "bg-white shadow-xl max-h-60 overflow-auto",
                "animate-fade-in",
                // Custom scrollbar styling
                "[&::-webkit-scrollbar]:w-1.5",
                "[&::-webkit-scrollbar-track]:bg-transparent",
                "[&::-webkit-scrollbar-thumb]:bg-franol-warm",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb:hover]:bg-franol-accent-blue/50",
              )}
              role="listbox"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-sm text-left",
                    "flex items-center gap-2.5",
                    "transition-colors duration-150",
                    option.value === value
                      ? "bg-franol-accent-blue/5 text-franol-text"
                      : "text-franol-text hover:bg-franol-cream",
                  )}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="truncate flex-1 font-medium">
                    {option.label}
                  </span>
                  {option.value === value && (
                    <Check
                      size={16}
                      className="flex-shrink-0 text-franol-accent-blue"
                    />
                  )}
                </button>
              ))}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
