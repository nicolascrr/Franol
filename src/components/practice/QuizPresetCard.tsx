"use client";

import { useLocale } from "@/contexts/LocaleContext";
import type { QuizPreset } from "@/types";
import {
  Play,
  Trash2,
  BookOpen,
  MessageSquare,
  Shuffle,
  PenTool,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizPresetCardProps {
  preset: QuizPreset;
  onLaunch: (preset: QuizPreset) => void;
  onDelete: (preset: QuizPreset) => void;
}

const MODE_ICONS: Record<string, typeof Shuffle> = {
  classic: Shuffle,
  vocabulary: BookOpen,
  expressions: MessageSquare,
  conjugation: PenTool,
  discovery: Compass,
};

export function QuizPresetCard({ preset, onLaunch, onDelete }: QuizPresetCardProps) {
  const { t } = useLocale();

  const Icon = MODE_ICONS[preset.mode] || Shuffle;
  const modeLabel = t(`practice.modes.${preset.mode}`);

  const formatBadge: Record<string, string> = {
    qcm: "QCM",
    translation: t("practice.setup.formatTranslation"),
    mixed: t("practice.setup.formatMixed"),
  };

  const dirLabel = preset.direction === "fr-to-es" ? "FR → ES" : "ES → FR";

  return (
    <div className="bg-white rounded-xl p-4 border border-franol-warm hover:shadow-md transition-shadow min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-franol-sand rounded-lg shrink-0">
            <Icon className="w-4 h-4 text-franol-muted" />
          </div>
          <h4 className="font-semibold text-franol-text text-sm truncate">
            {preset.name}
          </h4>
        </div>
        <button
          onClick={() => onDelete(preset)}
          className="p-1.5 rounded-lg text-franol-muted hover:text-red-500
                     hover:bg-red-50 transition-colors shrink-0"
          title={t("practice.presets.delete")}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 bg-franol-sand rounded-md text-xs text-franol-muted font-medium">
          {modeLabel}
        </span>
        <span className="px-2 py-0.5 bg-franol-sand rounded-md text-xs text-franol-muted font-medium">
          {formatBadge[preset.format] || preset.format}
        </span>
        <span className="px-2 py-0.5 bg-franol-sand rounded-md text-xs text-franol-muted font-medium">
          {dirLabel}
        </span>
        <span className="px-2 py-0.5 bg-franol-sand rounded-md text-xs text-franol-muted font-medium">
          {preset.question_count}Q
        </span>
      </div>

      {/* Launch button */}
      <button
        onClick={() => onLaunch(preset)}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-3 py-2",
          "bg-franol-accent-blue text-white text-sm font-medium rounded-lg",
          "hover:bg-blue-700 transition-colors active:scale-[0.98]",
        )}
      >
        <Play size={14} />
        {t("practice.presets.launch")}
      </button>
    </div>
  );
}
