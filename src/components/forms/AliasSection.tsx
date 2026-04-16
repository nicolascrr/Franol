"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { AliasInput } from "@/components/forms/AliasInput";
import { cn } from "@/lib/utils";

interface AliasSectionProps {
  aliasesFr: string[];
  aliasesEs: string[];
  onAddFr: (alias: string) => void;
  onRemoveFr: (index: number) => void;
  onAddEs: (alias: string) => void;
  onRemoveEs: (index: number) => void;
  placeholderFr: string;
  placeholderEs: string;
  labelFr: string;
  labelEs: string;
  title: string;
  disabled?: boolean;
}

export function AliasSection({
  aliasesFr,
  aliasesEs,
  onAddFr,
  onRemoveFr,
  onAddEs,
  onRemoveEs,
  placeholderFr,
  placeholderEs,
  labelFr,
  labelEs,
  title,
  disabled,
}: AliasSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  const totalAliases = aliasesFr.length + aliasesEs.length;

  // Measure content height for smooth transition
  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    measureHeight();
  }, [aliasesFr, aliasesEs, measureHeight]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="space-y-0">
      {/* Clickable header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "w-full bg-franol-sand border border-franol-warm rounded-xl px-4 py-3",
          "flex items-center justify-between cursor-pointer",
          "hover:bg-franol-warm/50 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-franol-text">{title}</span>

        <span className="flex items-center gap-2">
          {totalAliases > 0 && (
            <span className="bg-franol-accent-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalAliases}
            </span>
          )}
          <ChevronDown
            size={18}
            className={cn(
              "text-franol-muted transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </button>

      {/* Collapsible content */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? contentHeight : 0 }}
      >
        <div ref={contentRef} className="pt-3 space-y-3">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-franol-text">
                {labelFr}
              </label>
              <AliasInput
                aliases={aliasesFr}
                onAdd={onAddFr}
                onRemove={onRemoveFr}
                placeholder={placeholderFr}
                language="fr"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-franol-text">
                {labelEs}
              </label>
              <AliasInput
                aliases={aliasesEs}
                onAdd={onAddEs}
                onRemove={onRemoveEs}
                placeholder={placeholderEs}
                language="es"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
