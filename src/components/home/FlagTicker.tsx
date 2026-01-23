"use client";

import { useEffect, useState, useMemo } from "react";

const flags = [
  { code: "fr", name: "France" },
  { code: "be", name: "Belgique" },
  { code: "ch", name: "Suisse" },
  { code: "ca", name: "Canada" },
  { code: "sn", name: "Sénégal" },
  { code: "ci", name: "Côte d'Ivoire" },
  { code: "mg", name: "Madagascar" },
  { code: "ht", name: "Haïti" },
  { code: "lu", name: "Luxembourg" },
  { code: "mc", name: "Monaco" },
  { code: "es", name: "Espagne" },
  { code: "ar", name: "Argentine" },
  { code: "mx", name: "Mexique" },
  { code: "co", name: "Colombie" },
  { code: "pe", name: "Pérou" },
  { code: "cl", name: "Chili" },
  { code: "ec", name: "Équateur" },
  { code: "cu", name: "Cuba" },
  { code: "uy", name: "Uruguay" },
  { code: "ve", name: "Venezuela" },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FlagTicker() {
  const [mounted, setMounted] = useState(false);

  const { topRowFlags, bottomRowFlags } = useMemo(() => {
    const shuffled1 = shuffleArray(flags);
    const shuffled2 = shuffleArray(flags);
    return {
      topRowFlags: [...shuffled1, ...shuffled1],
      bottomRowFlags: [...shuffled2, ...shuffled2],
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-16" />;
  }

  return (
    <div className="w-full overflow-hidden ticker-mask select-none pointer-events-none">
      <div className="mb-4 overflow-hidden">
        <div className="flex animate-scroll-left flag-ticker w-fit">
          {topRowFlags.map((flag, index) => (
            <div
              key={`top-${flag.code}-${index}`}
              className="flex-shrink-0 w-16 h-10 rounded-md overflow-hidden shadow-sm opacity-60"
            >
              <img
                src={`https://flagcdn.com/w80/${flag.code}.png`}
                alt={flag.name}
                className="w-full h-full object-contain pointer-events-none"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="flex animate-scroll-right flag-ticker w-fit">
          {bottomRowFlags.map((flag, index) => (
            <div
              key={`bottom-${flag.code}-${index}`}
              className="flex-shrink-0 w-16 h-10 rounded-md overflow-hidden shadow-sm opacity-60"
            >
              <img
                src={`https://flagcdn.com/w80/${flag.code}.png`}
                alt={flag.name}
                className="w-full h-full object-contain pointer-events-none"
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
