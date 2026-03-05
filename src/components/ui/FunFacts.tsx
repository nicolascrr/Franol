"use client";

import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import factsFr from "@/data/fun-facts-fr.json";
import factsEs from "@/data/fun-facts-es.json";

interface FunFact {
  fact: string;
  type: string;
  keyword: string;
}

const FACT_TYPE_LABELS_FR: Record<string, string> = {
  faux_ami: "Faux ami",
  mot_identique: "Mot identique",
  mot_similaire: "Mot similaire",
  intraduisible: "Intraduisible",
  etymologie: "Étymologie",
  expression_idiomatique: "Expression",
  culture: "Culture",
  grammaire: "Grammaire",
  prononciation: "Prononciation",
};

const FACT_TYPE_LABELS_ES: Record<string, string> = {
  faux_ami: "Falso amigo",
  mot_identique: "Palabra idéntica",
  mot_similaire: "Palabra similar",
  intraduisible: "Intraducible",
  etymologie: "Etimología",
  expression_idiomatique: "Expresión",
  culture: "Cultura",
  grammaire: "Gramática",
  prononciation: "Pronunciación",
};

function pickRandom(facts: FunFact[], excludeKeyword?: string): FunFact {
  const pool =
    excludeKeyword && facts.length > 1
      ? facts.filter((f) => f.keyword !== excludeKeyword)
      : facts;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface FunFactsProps {
  locale: string;
}

export default function FunFacts({ locale }: FunFactsProps) {
  const isLearningSpanish = locale === "fr";
  const facts: FunFact[] = isLearningSpanish
    ? (factsFr as FunFact[])
    : (factsEs as FunFact[]);
  const labels = isLearningSpanish ? FACT_TYPE_LABELS_FR : FACT_TYPE_LABELS_ES;

  const [current, setCurrent] = useState<FunFact>(() => pickRandom(facts));

  const showNext = useCallback(() => {
    setCurrent((prev) => pickRandom(facts, prev.keyword));
  }, [facts]);

  return (
    <div className="max-w-md w-full">
      <div
        key={current.keyword + current.fact.slice(0, 10)}
        className="bg-white rounded-xl p-5 border border-franol-warm shadow-sm animate-fade-in"
      >
        <p className="text-xs font-medium text-franol-muted uppercase tracking-wide mb-3">
          {labels[current.type] || "Info"}
        </p>
        <p className="text-franol-text leading-relaxed">{current.fact}</p>
      </div>

      <button
        onClick={showNext}
        className="w-full mt-4 px-5 py-2.5 text-sm text-franol-muted
                  border border-franol-warm rounded-lg
                  hover:bg-franol-sand hover:text-franol-text
                  transition-colors
                  flex items-center justify-center gap-2"
      >
        <span>{isLearningSpanish ? "Autre anecdote" : "Otra anécdota"}</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
