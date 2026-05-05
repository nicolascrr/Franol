"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { QuizPreset } from "@/types";
import {
  Play,
  Trash2,
  Pencil,
  Check,
  X,
  BookOpen,
  MessageSquare,
  Shuffle,
  PenTool,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditQuizPresetCardProps {
  preset: QuizPreset;
  onLaunch: (preset: QuizPreset) => void;
  onDelete: (preset: QuizPreset) => void;
  onUpdate: (preset: QuizPreset, newName: string) => void;
}

const MODE_ICONS: Record<string, typeof Shuffle> = {
  classic: Shuffle,
  vocabulary: BookOpen,
  expressions: MessageSquare,
  conjugation: PenTool,
  discovery: Compass,
};

export function EditQuizPresetCard({
  preset,
  onLaunch,
  onDelete,
  onUpdate,
}: EditQuizPresetCardProps) {
  const { t } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  const Icon = MODE_ICONS[preset.mode] || Shuffle;
  const modeLabel = t(`practice.modes.${preset.mode}`);

  const formatBadge: Record<string, string> = {
    qcm: "QCM",
    translation: t("practice.setup.formatTranslation"),
    mixed: t("practice.setup.formatMixed"),
  };

  const dirLabel = preset.direction === "fr-to-es" ? "FR → ES" : "ES → FR";

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== preset.name) {
      onUpdate(preset, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(preset.name);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-franol-warm hover:shadow-md transition-shadow min-w-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-2 bg-franol-sand rounded-xl shrink-0">
            <Icon className="w-5 h-5 text-franol-muted" />
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border-2 border-franol-accent-blue
                          bg-white text-franol-text text-sm focus:outline-none min-w-0"
                maxLength={100}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-franol-muted hover:bg-franol-sand transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <h4 className="font-semibold text-franol-text text-sm truncate">
              {preset.name}
            </h4>
          )}
        </div>

        {/* Action buttons (only when not editing) */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg text-franol-muted hover:text-franol-accent-blue
                         hover:bg-blue-50 transition-colors"
              title={t("common.edit")}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(preset)}
              className="p-1.5 rounded-lg text-franol-muted hover:text-red-500
                         hover:bg-red-50 transition-colors"
              title={t("common.delete")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="px-2.5 py-1 bg-franol-sand rounded-lg text-xs text-franol-muted font-medium">
          {modeLabel}
        </span>
        <span className="px-2.5 py-1 bg-franol-sand rounded-lg text-xs text-franol-muted font-medium">
          {formatBadge[preset.format] || preset.format}
        </span>
        <span className="px-2.5 py-1 bg-franol-sand rounded-lg text-xs text-franol-muted font-medium">
          {dirLabel}
        </span>
        <span className="px-2.5 py-1 bg-franol-sand rounded-lg text-xs text-franol-muted font-medium">
          {preset.question_count}Q
        </span>
      </div>

      {/* Launch button */}
      <button
        onClick={() => onLaunch(preset)}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2.5",
          "bg-franol-accent-blue text-white text-sm font-medium rounded-xl",
          "hover:bg-blue-700 transition-colors active:scale-[0.98]",
        )}
      >
        <Play size={14} />
        {t("practice.presets.launch")}
      </button>
    </div>
  );
}
