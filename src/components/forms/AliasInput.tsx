"use client";

import { useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AliasInputProps {
  aliases: string[];
  onAdd: (alias: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  language: "fr" | "es";
  disabled?: boolean;
}

export function AliasInput({
  aliases,
  onAdd,
  onRemove,
  placeholder,
  language,
  disabled,
}: AliasInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-4 py-2 rounded-xl border-2 border-franol-warm
                     bg-white text-franol-text placeholder-franol-muted
                     focus:border-franol-accent-blue focus:outline-none transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="px-3 py-2 rounded-xl bg-franol-accent-blue text-white
                     hover:bg-blue-700 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
        </button>
      </div>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aliases.map((alias, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm"
            >
              <span className="text-franol-text">{alias}</span>
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                  language === "fr"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {language}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
