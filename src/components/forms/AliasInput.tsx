"use client";

import { useState, KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

interface AliasInputProps {
  aliases: string[];
  onAdd: (alias: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

export function AliasInput({
  aliases,
  onAdd,
  onRemove,
  placeholder,
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
          className="flex-1 px-4 py-2 rounded-xl border-2 border-franol-warm
                     bg-white text-franol-text placeholder-franol-muted
                     focus:border-franol-accent-blue focus:outline-none transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 rounded-xl bg-franol-accent-blue text-white
                     hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aliases.map((alias, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                         bg-franol-sand text-franol-text text-sm"
            >
              {alias}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="hover:text-red-500 transition-colors"
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
