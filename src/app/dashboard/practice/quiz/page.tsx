"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import {
  generateQuiz,
  type QuizConfig,
  type QuizQuestion,
  type QuizAnswer,
} from "@/lib/quiz";
import { generateAIQuizBatchWithStream, getAIExplanation } from "@/lib/openai";
import { checkAnswer } from "@/lib/levenshtein";
import {
  Loader2,
  Check,
  X,
  ArrowRight,
  LogOut,
  HelpCircle,
  Sparkles,
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

  // Fetch a fun fact from the AI
  const fetchFunFact = async () => {
    setIsLoadingFact(true);
    try {
      const params = new URLSearchParams();
      if (seenKeywords.length > 0) {
        params.set("exclude", seenKeywords.join(","));
      }
      params.set("locale", locale || "fr");
      const response = await fetch(`/api/ai/fun-fact?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentFact(data);
        if (data.keyword) {
          setSeenKeywords((prev) => [...prev.slice(-10), data.keyword]);
        }
      }
    } catch (error) {
      console.error("Error fetching fun fact:", error);
    } finally {
      setIsLoadingFact(false);
    }
  };

  // Fetch first fun fact on mount when in discovery mode
  useEffect(() => {
    if (funFactFetchedRef.current) return;

    const configStr = sessionStorage.getItem("quizConfig");
    if (configStr) {
      const parsedConfig = JSON.parse(configStr) as QuizConfig;
      if (parsedConfig.mode === "discovery" && parsedConfig.isAI) {
        funFactFetchedRef.current = true;
        fetchFunFact();
      }
    }
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
            const isResume = !configStr || (
              configStr && JSON.parse(configStr).prompt === savedQuiz.config.prompt
              && JSON.parse(configStr).mode === savedQuiz.config.mode
            );

            if (isResume && savedQuiz.currentIndex > 0) {
              quizLoadedRef.current = true;
              setConfig(savedQuiz.config);
              setQuestions(savedQuiz.questions);
              setTotalQuestions(savedQuiz.questions.length);
              setCurrentIndex(savedQuiz.currentIndex);
              setAnswers(savedQuiz.answers || []);
              setState("playing");

              // Restaurer en sessionStorage pour les autres pages
              sessionStorage.setItem("quizConfig", JSON.stringify(savedQuiz.config));
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

  const handleAnswer = useCallback(
    (answer: string) => {
      if (state !== "playing" || !currentQuestion) return;

      // For QCM, use exact comparison (no Levenshtein tolerance needed since user picks from options)
      // For translation, use checkAnswer with fuzzy matching for typo tolerance
      const correct =
        currentQuestion.format === "qcm"
          ? answer === currentQuestion.correctAnswer
          : checkAnswer(
              answer,
              currentQuestion.correctAnswer,
              currentQuestion.aliases,
            );

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

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setUserInput("");
      setSelectedOption(null);
      setIsCorrect(null);
      setState("playing");

      // Mettre à jour la progression dans localStorage
      try {
        const saved = localStorage.getItem("savedQuiz");
        if (saved) {
          const data = JSON.parse(saved);
          data.currentIndex = nextIndex;
          data.answers = answers;
          localStorage.setItem("savedQuiz", JSON.stringify(data));
        }
      } catch {
        // Ignore
      }
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
      // Quiz terminé : nettoyer le savedQuiz
      localStorage.removeItem("savedQuiz");
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
  ]);

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
      if (state === "answered" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, handleNext]);

  // Show loading if waiting for questions
  if (state === "loading") {
    // locale "fr" = FR portal, user is French → labels in French
    // locale "es" = ES portal, user is Argentine → labels in Spanish
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

        {/* Fun fact card */}
        {isDiscoveryMode && (
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
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-franol-cream">
      {/* Quit Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-franol-text mb-2">
              {t("practice.quiz.quit")}?
            </h3>
            <p className="text-franol-muted mb-6">
              {t("practice.quiz.quitConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-franol-sand text-franol-text
                          font-medium hover:bg-franol-warm transition-colors"
              >
                {t("practice.quiz.continue")}
              </button>
              <button
                onClick={handleQuit}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white
                          font-medium hover:bg-red-600 transition-colors"
              >
                {t("practice.quiz.quit")}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {isDiscoveryMode && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-xs font-semibold text-white">
                  <Sparkles size={10} />
                  IA
                </div>
              )}
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
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-2xl mx-auto p-6">
        <div key={currentIndex} className="animate-fade-in">
          {/* Question Card */}
          <div className="bg-white rounded-2xl p-8 border border-franol-warm mb-6 shadow-sm">
            {currentQuestion.type === "conjugation" &&
              currentQuestion.tense &&
              currentQuestion.pronoun && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {t("practice.quiz.tense")}: {currentQuestion.tense}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {t("practice.quiz.pronoun")}: {currentQuestion.pronoun}
                  </span>
                </div>
              )}

            <h2 className="text-2xl md:text-3xl font-display font-bold text-franol-text text-center">
              {currentQuestion.type === "conjugation" &&
              currentQuestion.tense &&
              currentQuestion.pronoun
                ? `${t("practice.quiz.conjugate")}: ${currentQuestion.questionText}`
                : currentQuestion.questionText}
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
                      {t("practice.quiz.explain")}
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
                              rounded-lg border border-black/10
                              transition-colors disabled:opacity-50"
                  >
                    <HelpCircle size={16} />
                    {t("practice.quiz.explain")}
                  </button>
                )}
              </div>

              {showExplanation && (
                <div className="p-4 rounded-xl mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-orange-500" />
                    <span className="text-sm font-semibold text-orange-700">
                      {t("practice.quiz.aiExplanation")}
                    </span>
                  </div>
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

              <button
                onClick={handleNext}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4
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
          )}
        </div>
      </div>
    </div>
  );
}
