"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import {
  generateQuiz,
  type QuizConfig,
  type QuizQuestion,
  type QuizAnswer,
} from "@/lib/quiz";
import { generateAIQuizBatchWithStream, getAIExplanation } from "@/lib/ai";
import { checkAnswer, checkConjugationAnswer } from "@/lib/levenshtein";
import { fixGuillemets } from "@/lib/utils";
import { getTenseLabel } from "@/lib/tenses";
import { fromQuizDirection } from "@/lib/lang";
import { QuitModal } from "@/components/practice/QuitModal";
import {
  Loader2,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  LogOut,
  HelpCircle,
} from "lucide-react";

type QuizState = "loading" | "playing" | "answered" | "finished";

export default function QuizPage() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [state, setState] = useState<QuizState>("loading");
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [startTime] = useState(Date.now());
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  // AI explanation state
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Quiz state
  const [totalQuestions, setTotalQuestions] = useState(0);
  // Fun facts state
  const [currentFact, setCurrentFact] = useState<{
    fact: string;
    type: string;
    keyword: string;
  } | null>(null);
  const [isLoadingFact, setIsLoadingFact] = useState(false);
  const [seenKeywords, setSeenKeywords] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);
  const funFactFetchedRef = useRef(false);
  const quizLoadedRef = useRef(false);

  // Fetch a fun fact from static data
  const fetchFunFact = async () => {
    setIsLoadingFact(true);
    try {
      // Dynamically import facts based on locale
      const facts =
        locale === "es"
          ? (await import("@/data/fun-facts-es.json")).default
          : (await import("@/data/fun-facts-fr.json")).default;

      // Filter out seen keywords
      const availableFacts =
        seenKeywords.length > 0
          ? facts.filter(
              (f: { keyword: string }) => !seenKeywords.includes(f.keyword),
            )
          : facts;

      // Pick a random fact
      if (availableFacts.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableFacts.length);
        const selectedFact = availableFacts[randomIndex];
        setCurrentFact(selectedFact);
        if (selectedFact.keyword) {
          setSeenKeywords((prev) => [...prev.slice(-10), selectedFact.keyword]);
        }
      }
    } catch (error) {
      console.error("Error fetching fun fact:", error);
    } finally {
      setIsLoadingFact(false);
    }
  };

  // Fetch first fun fact on mount — shown for ALL quiz modes during loading
  // since all modes now use AI (wrong answers, conjugation, discovery)
  useEffect(() => {
    if (funFactFetchedRef.current) return;

    funFactFetchedRef.current = true;
    fetchFunFact();
  }, []);

  // Load config and generate ALL questions in one call
  useEffect(() => {
    // Check if we need to force regeneration
    const forceRegenerate = sessionStorage.getItem("forceRegenerate");
    if (forceRegenerate) {
      sessionStorage.removeItem("forceRegenerate");
      quizLoadedRef.current = false;
      funFactFetchedRef.current = false;
      generatingRef.current = false;

      // Reset all state for new questions
      setState("loading");
      setQuestions([]);
      setCurrentIndex(0);
      setAnswers([]);
      setUserInput("");
      setSelectedOption(null);
      setIsCorrect(null);
      setShowExplanation(false);
      setExplanation("");
    }

    if (quizLoadedRef.current) return;

    const loadQuiz = async () => {
      const configStr = sessionStorage.getItem("quizConfig");

      // Vérifier s'il y a un quiz sauvegardé à reprendre
      const savedQuizStr = localStorage.getItem("savedQuiz");
      if (savedQuizStr) {
        try {
          const savedQuiz = JSON.parse(savedQuizStr);
          // Vérifier que le quiz sauvegardé correspond au bon portail
          if (savedQuiz.locale === (locale || "fr")) {
            // Si pas de config en session OU si c'est le même quiz (pas un nouveau lancement)
            const isResume =
              !configStr ||
              (configStr &&
                JSON.parse(configStr).prompt === savedQuiz.config.prompt &&
                JSON.parse(configStr).mode === savedQuiz.config.mode);

            if (isResume && savedQuiz.questions && savedQuiz.questions.length > 0) {
              quizLoadedRef.current = true;
              setConfig(savedQuiz.config);
              setQuestions(savedQuiz.questions);
              setTotalQuestions(savedQuiz.questions.length);
              setCurrentIndex(savedQuiz.currentIndex);
              setAnswers(savedQuiz.answers || []);
              setState("playing");

              // Restaurer en sessionStorage pour les autres pages
              sessionStorage.setItem(
                "quizConfig",
                JSON.stringify(savedQuiz.config),
              );
              sessionStorage.setItem(
                "cachedQuizQuestions",
                JSON.stringify(savedQuiz.questions),
              );
              return;
            }
          } else {
            // Portail différent → supprimer le quiz sauvegardé
            localStorage.removeItem("savedQuiz");
          }
        } catch {
          localStorage.removeItem("savedQuiz");
        }
      }

      if (!configStr) {
        router.replace("/dashboard/practice");
        return;
      }

      quizLoadedRef.current = true;

      try {
        const parsedConfig = JSON.parse(configStr) as QuizConfig;
        setConfig(parsedConfig);

        let generatedQuestions: QuizQuestion[];

        if (parsedConfig.mode === "discovery" && parsedConfig.isAI) {
          // Vérifier si on a des questions en cache (replay du même quiz)
          const cachedStr = sessionStorage.getItem("cachedQuizQuestions");
          if (cachedStr) {
            generatedQuestions = JSON.parse(cachedStr);
            setTotalQuestions(generatedQuestions.length);
          } else {
            const prompt = parsedConfig.prompt || "";

            // Get excluded words from previous quizzes (for "new questions" feature)
            const excludedWordsStr = sessionStorage.getItem("excludedWords");
            const excludedWords = excludedWordsStr
              ? JSON.parse(excludedWordsStr)
              : [];

            // Nombre de questions demandé
            const questionCount = parsedConfig.questionCount || 10;
            setTotalQuestions(questionCount);

            // Générer TOUTES les questions en un seul appel API
            const result = await generateAIQuizBatchWithStream(
              prompt,
              questionCount,
              0,
              parsedConfig.direction,
              parsedConfig.format,
              (locale || "fr") as "fr" | "es",
              excludedWords,
            );

            // Determine format for each question based on config
            const getQuestionFormat = () => {
              if (parsedConfig.format === "mixed") {
                return Math.random() > 0.5 ? "qcm" : "translation";
              }
              return parsedConfig.format;
            };

            generatedQuestions = result.questions.map((q, index) => ({
              id: `ai-${Date.now()}-${index}`,
              type: q.type || "vocabulary",
              questionText: q.questionText,
              correctAnswer: q.correctAnswer,
              aliases: [],
              wrongAnswers: q.wrongAnswers,
              format: getQuestionFormat(),
              wordFr: q.wordFr,
              wordEs: q.wordEs,
              aliasesFr: q.aliasesFr,
              aliasesEs: q.aliasesEs,
            }));

            // Ajuster le nombre total si l'API a retourné moins de questions
            if (generatedQuestions.length < questionCount) {
              setTotalQuestions(generatedQuestions.length);
            }

            // Sauvegarder en cache pour le replay
            sessionStorage.setItem(
              "cachedQuizQuestions",
              JSON.stringify(generatedQuestions),
            );
          }
        } else {
          setTotalQuestions(parsedConfig.questionCount);
          generatedQuestions = await generateQuiz(parsedConfig);
        }

        if (generatedQuestions.length === 0) {
          router.replace("/dashboard/practice");
          return;
        }

        // Adjust totalQuestions to actual count returned
        // (AI may return fewer questions than requested due to truncation)
        if (generatedQuestions.length < parsedConfig.questionCount) {
          setTotalQuestions(generatedQuestions.length);
        }

        // Sauvegarder le quiz dans localStorage pour reprise
        try {
          localStorage.setItem(
            "savedQuiz",
            JSON.stringify({
              config: parsedConfig,
              questions: generatedQuestions,
              currentIndex: 0,
              answers: [],
              startTime: Date.now(),
              locale: locale || "fr",
            }),
          );
        } catch {
          // localStorage plein ou indisponible, on continue sans sauvegarder
        }

        setQuestions(generatedQuestions);
        setState("playing");
      } catch (error) {
        console.error("Error loading quiz:", error);
        router.replace("/dashboard/practice");
      }
    };

    loadQuiz();
  }, [router, locale]);

  // Shuffle options when question changes
  useEffect(() => {
    if (
      questions[currentIndex]?.format === "qcm" &&
      questions[currentIndex].wrongAnswers
    ) {
      const options = [
        questions[currentIndex].correctAnswer,
        ...(questions[currentIndex].wrongAnswers || []),
      ];
      setShuffledOptions(shuffleArray(options));
    }
  }, [currentIndex, questions]);

  // Focus input for translation questions
  useEffect(() => {
    if (
      state === "playing" &&
      questions[currentIndex]?.format === "translation"
    ) {
      inputRef.current?.focus();
    }
  }, [state, currentIndex, questions]);

  // Reset explanation when moving to next question
  useEffect(() => {
    setShowExplanation(false);
    setExplanation("");
  }, [currentIndex]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const currentQuestion = questions[currentIndex];
  const score = answers.filter((a) => a.isCorrect).length;
  const isDiscoveryMode = config?.mode === "discovery";
  const isConjugationMode = config?.mode === "conjugation";

  // Derive locale for tense labels from quiz config
  // For conjugation: tense labels are in the LEARNED language (portal's target)
  // For other modes: use the source language from direction
  const tenseLocale = useMemo(() => {
    if (config?.mode === "conjugation") {
      // Learned language = portal's target language
      return config.locale === "fr" ? ("es" as const) : ("fr" as const);
    }
    if (!config?.direction)
      return locale === "fr" ? ("fr" as const) : ("es" as const);
    const { source } = fromQuizDirection(config.direction);
    return source;
  }, [config?.mode, config?.direction, config?.locale, locale]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (state !== "playing" || !currentQuestion) return;

      let correct: boolean;

      if (currentQuestion.format === "qcm") {
        // QCM: exact string match (user picks from options)
        correct = answer === currentQuestion.correctAnswer;
      } else if (currentQuestion.type === "conjugation") {
        // Conjugation translation: strict match only (no Levenshtein tolerance)
        correct = checkConjugationAnswer(
          answer,
          currentQuestion.correctAnswer,
          currentQuestion.aliases,
        );
      } else {
        // Vocabulary/Expression translation: typo-tolerant matching
        correct = checkAnswer(
          answer,
          currentQuestion.correctAnswer,
          currentQuestion.aliases,
        );
      }

      setIsCorrect(correct);
      setState("answered");

      const newAnswer: QuizAnswer = {
        question: currentQuestion,
        userAnswer: answer,
        isCorrect: correct,
      };
      setAnswers((prev) => [...prev, newAnswer]);
    },
    [state, currentQuestion],
  );

  const handleQCMSelect = (option: string) => {
    if (state !== "playing") return;
    setSelectedOption(option);
    handleAnswer(option);
  };

  const handleTranslationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "playing" || !userInput.trim()) return;
    handleAnswer(userInput.trim());
  };

  const handleGetExplanation = async () => {
    if (!currentQuestion || isLoadingExplanation || showExplanation) return;

    setIsLoadingExplanation(true);
    setShowExplanation(true);

    try {
      const userAnswer =
        currentQuestion.format === "qcm" ? selectedOption || "" : userInput;
      const aiExplanation = await getAIExplanation(
        currentQuestion.questionText,
        currentQuestion.correctAnswer,
        userAnswer,
        locale || "fr",
      );
      setExplanation(aiExplanation);
    } catch (error) {
      console.error("Error getting explanation:", error);
      setExplanation(t("common.error"));
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  /**
   * Navigate to a specific question index.
   * If the question has already been answered, restore its answer state (review mode).
   * Otherwise, show it as a fresh question.
   */
  const navigateToQuestion = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= totalQuestions) return;

    setCurrentIndex(targetIndex);
    setShowExplanation(false);
    setExplanation("");

    // Check if this question has already been answered
    const existingAnswer = answers[targetIndex];
    if (existingAnswer) {
      // Review mode: restore the answer state
      setState("answered");
      setIsCorrect(existingAnswer.isCorrect);
      if (currentQuestion?.format === "qcm" || questions[targetIndex]?.format === "qcm") {
        setSelectedOption(existingAnswer.userAnswer);
        setUserInput("");
      } else {
        setSelectedOption(null);
        setUserInput(existingAnswer.userAnswer);
      }
    } else {
      // Fresh question
      setState("playing");
      setUserInput("");
      setSelectedOption(null);
      setIsCorrect(null);
    }

    // Update localStorage progress
    try {
      const saved = localStorage.getItem("savedQuiz");
      if (saved) {
        const data = JSON.parse(saved);
        data.currentIndex = targetIndex;
        data.answers = answers;
        localStorage.setItem("savedQuiz", JSON.stringify(data));
      }
    } catch {
      // Ignore
    }
  }, [totalQuestions, answers, questions, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      navigateToQuestion(currentIndex + 1);
    } else {
      // Quiz finished
      const duration = Math.round((Date.now() - startTime) / 1000);
      const finalAnswers = [...answers];

      if (finalAnswers.length < totalQuestions && currentQuestion) {
        finalAnswers.push({
          question: currentQuestion,
          userAnswer: selectedOption || userInput,
          isCorrect: isCorrect || false,
        });
      }

      const result = {
        totalQuestions: totalQuestions,
        correctAnswers: finalAnswers.filter((a) => a.isCorrect).length,
        scorePercentage: Math.round(
          (finalAnswers.filter((a) => a.isCorrect).length / totalQuestions) *
            100,
        ),
        durationSeconds: duration,
        questions: finalAnswers,
      };

      sessionStorage.setItem("quizResult", JSON.stringify(result));
      router.push("/dashboard/practice/results");
    }
  }, [
    currentIndex,
    totalQuestions,
    startTime,
    answers,
    currentQuestion,
    selectedOption,
    userInput,
    isCorrect,
    router,
    navigateToQuestion,
  ]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      navigateToQuestion(currentIndex - 1);
    }
  }, [currentIndex, navigateToQuestion]);

  const handleQuit = () => {
    sessionStorage.removeItem("quizConfig");
    sessionStorage.removeItem("discoveryPrompt");
    sessionStorage.removeItem("cachedQuizQuestions");
    localStorage.removeItem("savedQuiz");
    router.push("/dashboard/practice");
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && state === "answered") {
        // Enter: go to next (but only if on the latest unanswered question)
        const nextUnanswered = answers.length;
        if (currentIndex < nextUnanswered) {
          // Viewing an old answered question — don't auto-advance on Enter
          return;
        }
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowRight" && state === "answered") {
        e.preventDefault();
        if (currentIndex < totalQuestions - 1) {
          navigateToQuestion(currentIndex + 1);
        }
      } else if (e.key === "ArrowLeft" && state === "answered") {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, handleNext, handlePrevious, navigateToQuestion, currentIndex, totalQuestions, answers.length]);

  // Fun fact type labels (used in loading screen)
  const isLearningSpanish = locale === "fr";
  const factTypeLabels: Record<string, string> = isLearningSpanish
    ? {
        faux_ami: "Faux ami",
        mot_identique: "Mot identique",
        mot_similaire: "Mot similaire",
        intraduisible: "Intraduisible",
        etymologie: "Étymologie",
        expression_idiomatique: "Expression",
        culture: "Culture",
        grammaire: "Grammaire",
        prononciation: "Prononciation",
      }
    : {
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

  // Show loading if waiting for questions
  if (state === "loading") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        {/* Loader animé */}
        <div className="relative mb-8">
          <div className="w-16 h-16 rounded-full border-4 border-franol-warm border-t-franol-accent-blue animate-spin" />
        </div>

        <p className="text-franol-muted mb-8 text-center text-sm">
          {isDiscoveryMode
            ? t("practice.discovery.generating")
            : t("common.loading")}
        </p>

        {/* Fun fact card — shown for ALL quiz modes during loading */}
        <div className="max-w-md w-full">
          {currentFact ? (
            <div
              key={currentFact.keyword}
              className="bg-white rounded-xl p-5 border border-franol-warm shadow-sm animate-fade-in"
            >
              {/* Type label */}
              <p className="text-xs font-medium text-franol-muted uppercase tracking-wide mb-3">
                {factTypeLabels[currentFact.type] || "Info"}
              </p>

              {/* Fact text */}
              <p className="text-franol-text leading-relaxed">
                {currentFact.fact}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-5 border border-franol-warm shadow-sm">
              <div className="h-4 bg-franol-sand rounded animate-pulse mb-3 w-20" />
              <div className="h-5 bg-franol-sand rounded animate-pulse w-full" />
            </div>
          )}

          {/* Next button */}
          <button
            onClick={fetchFunFact}
            disabled={isLoadingFact}
            className="w-full mt-4 px-5 py-2.5 text-sm text-franol-muted
                      border border-franol-warm rounded-lg
                      hover:bg-franol-sand hover:text-franol-text
                      transition-colors disabled:opacity-50
                      flex items-center justify-center gap-2"
          >
            {isLoadingFact ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>
                  {isLearningSpanish ? "Autre anecdote" : "Otra anécdota"}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-franol-cream">
      <QuitModal
        show={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        onConfirm={handleQuit}
      />

      {/* Header */}
      <div className="sticky top-0 bg-franol-cream/95 backdrop-blur-sm border-b border-franol-warm z-40">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowQuitModal(true)}
              className="p-2 rounded-lg text-franol-muted hover:text-red-500
                        hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-franol-text">
                {t("practice.quiz.question")} {currentIndex + 1}{" "}
                {t("practice.quiz.of")} {totalQuestions}
              </span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
              <Check size={18} />
              {score}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-franol-warm rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out
                         ${
                           isDiscoveryMode
                             ? "bg-gradient-to-r from-orange-500 to-amber-500"
                             : "bg-franol-accent-blue"
                         }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question progress dots */}
          {totalQuestions <= 50 && (
            <>
              {/* Mobile: single scrollable row */}
              <div className="mt-3 overflow-x-auto hide-scrollbar md:hidden">
                <div className="flex items-center gap-1.5 px-2 py-1 w-max mx-auto">
                  {questions.map((_, index) => {
                    const isAnswered = index < answers.length;
                    const answer = answers[index];
                    const isCurrent = index === currentIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isAnswered || index === currentIndex) {
                            navigateToQuestion(index);
                          }
                        }}
                        disabled={!isAnswered && index !== currentIndex}
                        className={`
                          w-7 h-7 min-w-[28px] min-h-[28px] rounded-lg text-[10px] font-bold shrink-0
                          transition-all duration-200 flex items-center justify-center
                          border
                          ${isCurrent ? "ring-2 ring-offset-1 ring-franol-accent-blue scale-105" : ""}
                          ${isAnswered
                            ? answer?.isCorrect
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-red-100 text-red-700 border-red-300"
                            : index === currentIndex
                              ? "bg-franol-accent-blue text-white border-franol-accent-blue"
                              : "bg-white text-franol-muted border-franol-warm cursor-default"
                          }
                        `}
                        title={`${t("practice.quiz.question")} ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Desktop: wrapping grid, all visible */}
              <div className="hidden md:block mt-3">
                <div className="flex flex-wrap items-center justify-center gap-1.5 px-2 py-1">
                  {questions.map((_, index) => {
                    const isAnswered = index < answers.length;
                    const answer = answers[index];
                    const isCurrent = index === currentIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isAnswered || index === currentIndex) {
                            navigateToQuestion(index);
                          }
                        }}
                        disabled={!isAnswered && index !== currentIndex}
                        className={`
                          w-7 h-7 min-w-[28px] min-h-[28px] rounded-lg text-[10px] font-bold
                          transition-all duration-200 flex items-center justify-center
                          border
                          ${isCurrent ? "ring-2 ring-offset-1 ring-franol-accent-blue scale-105" : ""}
                          ${isAnswered
                            ? answer?.isCorrect
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-red-100 text-red-700 border-red-300"
                            : index === currentIndex
                              ? "bg-franol-accent-blue text-white border-franol-accent-blue"
                              : "bg-white text-franol-muted border-franol-warm cursor-default"
                          }
                        `}
                        title={`${t("practice.quiz.question")} ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-2xl mx-auto p-6">
        <div key={currentIndex} className="animate-fade-in">
          {/* Question Card */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-franol-warm mb-6 shadow-sm">
            {currentQuestion.type === "conjugation" &&
              currentQuestion.tense &&
              currentQuestion.pronoun && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-base font-semibold">
                    {getTenseLabel(currentQuestion.tense, tenseLocale)}
                  </span>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-base font-semibold">
                    {currentQuestion.pronoun}
                  </span>
                </div>
              )}

            {/* Synonym question badge */}
            {currentQuestion.isSynonymQuestion && (
              <div className="flex items-center justify-center mb-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                  {t("practice.quiz.sayDifferently")}
                </span>
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-display font-bold text-franol-text text-center">
              {fixGuillemets(
                currentQuestion.type === "conjugation" &&
                  currentQuestion.tense &&
                  currentQuestion.pronoun
                  ? `${currentQuestion.questionText}`
                  : currentQuestion.questionText,
              )}
            </h2>
          </div>

          {/* Answer Section */}
          {currentQuestion.format === "qcm" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shuffledOptions.map((option, index) => {
                const isSelected = selectedOption === option;
                const isCorrectOption =
                  option === currentQuestion.correctAnswer;
                const showResult = state === "answered";

                let buttonClass =
                  "bg-white border-franol-warm hover:border-franol-accent-blue";

                if (showResult) {
                  if (isCorrectOption) {
                    buttonClass =
                      "bg-emerald-50 border-emerald-500 text-emerald-700";
                  } else if (isSelected && !isCorrectOption) {
                    buttonClass = "bg-red-50 border-red-500 text-red-700";
                  } else {
                    buttonClass = "bg-gray-50 border-gray-200 text-gray-400";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleQCMSelect(option)}
                    disabled={state === "answered"}
                    className={`p-4 rounded-xl border-2 text-left font-medium
                               transition-all duration-200 ${buttonClass}
                               ${state === "playing" ? "hover:shadow-md active:scale-[0.98]" : ""}
                               disabled:cursor-default`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showResult && isCorrectOption && (
                        <Check className="w-5 h-5 text-emerald-600" />
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleTranslationSubmit}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={state === "answered"}
                  placeholder={t("practice.quiz.typeAnswer")}
                  className={`w-full px-6 py-4 rounded-xl border-2 text-lg
                             bg-white focus:outline-none transition-colors
                             ${
                               state === "answered"
                                 ? isCorrect
                                   ? "border-emerald-500 bg-emerald-50"
                                   : "border-red-500 bg-red-50"
                                 : "border-franol-warm focus:border-franol-accent-blue"
                             }`}
                />
                {state === "answered" && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isCorrect ? (
                      <Check className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <X className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                )}
              </div>

              {state === "playing" && (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="w-full mt-4 px-6 py-4 bg-franol-accent-blue text-white
                            font-semibold rounded-xl hover:bg-blue-700 transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                            active:scale-[0.98]"
                >
                  {t("practice.quiz.validate")}
                </button>
              )}
            </form>
          )}

          {/* Feedback & Next Button */}
          {state === "answered" && (
            <div className="mt-6 animate-slide-up">
              <div
                className={`p-4 rounded-xl mb-4 ${
                  isCorrect
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isCorrect ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {isCorrect
                        ? t("practice.quiz.correct")
                        : t("practice.quiz.incorrect")}
                    </p>
                    {/* Always show correct answer */}
                    <p className="text-franol-muted mt-1">
                      {isCorrect ? (
                        <>
                          {t("practice.quiz.theAnswerIs")}{" "}
                          <span className="font-semibold text-emerald-700">
                            {currentQuestion.correctAnswer}
                          </span>
                        </>
                      ) : (
                        <>
                          {t("practice.quiz.correctAnswerWas")}{" "}
                          <span className="font-semibold text-franol-text">
                            {currentQuestion.correctAnswer}
                          </span>
                        </>
                      )}
                    </p>
                    {/* Show infinitive translation for conjugation questions */}
                    {currentQuestion.type === "conjugation" && (
                      <p className="text-franol-muted mt-1 text-sm">
                        {t("practice.quiz.translation")}:{" "}
                        <span className="italic">
                          {locale === "fr" ? currentQuestion.wordFr : currentQuestion.wordEs}
                        </span>
                      </p>
                    )}
                    {/* Show synonyms for vocabulary and expression questions */}
                    {(currentQuestion.type === "vocabulary" || currentQuestion.type === "expression" || currentQuestion.type === "synonym") &&
                      currentQuestion.aliases && currentQuestion.aliases.length > 0 && (
                      <p className="text-franol-muted mt-1.5 text-sm">
                        {t("practice.quiz.youCanAlsoSay")}{" "}
                        {currentQuestion.aliases.map((alias, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-franol-warm mx-1">•</span>}
                            <span className="font-medium text-franol-text">{alias}</span>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  {/* Desktop: inline button */}
                  {isDiscoveryMode && !showExplanation && (
                    <button
                      onClick={handleGetExplanation}
                      disabled={isLoadingExplanation}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 ml-3
                                text-xs font-medium text-franol-muted
                                hover:text-franol-accent-blue hover:bg-blue-50
                                rounded-lg transition-colors shrink-0
                                disabled:opacity-50"
                    >
                      <HelpCircle size={14} />
                      {t("practice.quiz.explanation")}
                    </button>
                  )}
                </div>

                {/* Mobile: full-width button */}
                {isDiscoveryMode && !showExplanation && (
                  <button
                    onClick={handleGetExplanation}
                    disabled={isLoadingExplanation}
                    className="flex sm:hidden items-center justify-center gap-2
                              w-full mt-3 px-4 py-2.5 text-sm font-medium
                              text-franol-muted hover:text-franol-accent-blue
                              bg-white/60 hover:bg-white
                              rounded-lg border border-franol-warm
                              transition-colors disabled:opacity-50"
                  >
                    <HelpCircle size={16} />
                    {t("practice.quiz.explanation")}
                    {" ?"}
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="p-4 rounded-xl mb-4 bg-franol-sand border border-franol-warm animate-fade-in">
                  <p className="text-sm font-medium text-franol-text mb-2">
                    {t("practice.quiz.explanation")}
                  </p>
                  {isLoadingExplanation ? (
                    <div className="flex items-center gap-2 text-franol-muted">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-franol-text leading-relaxed">
                      {explanation}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {/* Previous button (US-Q11) — icon only on mobile */}
                {currentIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center justify-center
                              w-12 md:w-auto md:px-5 md:gap-2 py-4
                              bg-white border-2 border-franol-warm text-franol-text
                              font-semibold rounded-xl hover:border-franol-accent-blue
                              transition-colors active:scale-[0.98] shrink-0"
                  >
                    <ArrowLeft size={20} />
                    <span className="hidden md:inline">{t("practice.quiz.previous")}</span>
                  </button>
                )}

                {/* Next / See results button */}
                <button
                  onClick={handleNext}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4
                            font-semibold rounded-xl transition-colors active:scale-[0.98]
                            ${
                              isDiscoveryMode
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                                : "bg-franol-accent-blue text-white hover:bg-blue-700"
                            }`}
                >
                  {currentIndex < totalQuestions - 1
                    ? t("practice.quiz.next")
                    : t("practice.results.title")}
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
