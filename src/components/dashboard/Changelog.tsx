"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, History } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { releases, getCurrentVersion, type Release, type ReleaseFeature } from "@/data/releases";

const typeColors: Record<string, string> = {
  feature: "bg-emerald-500",
  improvement: "bg-blue-500",
  fix: "bg-orange-500",
};

function FeatureItem({ feature }: { feature: ReleaseFeature }) {
  const color = typeColors[feature.type];

  return (
    <li className="flex items-start gap-3">
      <span
        className={`inline-block w-2 h-2 mt-2 rounded-full flex-shrink-0 ${color}`}
      />
      <div>
        <p className="text-franol-text font-medium">{feature.title}</p>
        <p className="text-sm text-franol-muted">{feature.desc}</p>
      </div>
    </li>
  );
}

function ReleaseCard({
  release,
  sourceLang,
  isExpanded,
  onToggle,
  isLatest,
}: {
  release: Release;
  sourceLang: "fr" | "es";
  isExpanded: boolean;
  onToggle: () => void;
  isLatest: boolean;
}) {
  const formattedDate = new Date(release.date).toLocaleDateString(
    sourceLang === "fr" ? "fr-FR" : "es-ES",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="bg-white rounded-2xl border border-franol-warm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-franol-sand/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-franol-text">
              v{release.version}
            </span>
            {isLatest && (
              <span className="px-2 py-0.5 text-xs font-medium bg-franol-accent-blue text-white rounded-full">
                Current
              </span>
            )}
          </div>
          <span className="text-sm text-franol-muted">{formattedDate}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-franol-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-franol-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-franol-warm">
          <ul className="space-y-4">
            {release.features.map((feature, index) => (
              <FeatureItem
                key={index}
                feature={feature}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Changelog() {
  const { sourceLang, t } = useLocale();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([releases[0]?.version])
  );
  const [showHistory, setShowHistory] = useState(false);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const latestRelease = releases[0];
  const olderReleases = releases.slice(1);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-franol-accent-blue" />
        <h2 className="text-xl font-display font-semibold text-franol-text">
          {t("dashboard.whatsNew")}
        </h2>
        <span className="ml-auto text-sm text-franol-muted bg-franol-sand px-3 py-1 rounded-full">
          {t("dashboard.version")} {getCurrentVersion()}
        </span>
      </div>

      {/* Latest release */}
      {latestRelease && (
        <ReleaseCard
          release={latestRelease}
          sourceLang={sourceLang}
          isExpanded={expandedVersions.has(latestRelease.version)}
          onToggle={() => toggleVersion(latestRelease.version)}
          isLatest={true}
        />
      )}

      {/* History toggle */}
      {olderReleases.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 text-franol-muted hover:text-franol-text transition-colors"
        >
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">
            {showHistory ? "Hide history" : "View history"}
          </span>
          {showHistory ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Older releases */}
      {showHistory && olderReleases.length > 0 && (
        <div className="mt-4 space-y-3">
          {olderReleases.map((release) => (
            <ReleaseCard
              key={release.version}
              release={release}
              sourceLang={sourceLang}
              isExpanded={expandedVersions.has(release.version)}
              onToggle={() => toggleVersion(release.version)}
              isLatest={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
