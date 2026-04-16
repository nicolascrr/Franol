# QUIZ — User Stories

> **Category:** Quiz features
> **Stack:** Next.js 14 App Router · TypeScript · Supabase · Google Gemini AI · Tailwind CSS
> **Status:** Planning — awaiting validation

---

## Table of Contents

1. [US-Q1: Tense Mapping Data Files](#us-q1-tense-mapping-data-files)
2. [US-Q2: Conjugation Configuration Panel — Tense Selection](#us-q2-conjugation-configuration-panel--tense-selection)
3. [US-Q3: Conjugation Configuration Panel — Verb Group Selection](#us-q3-conjugation-configuration-panel--verb-group-selection)
4. [US-Q4: Conjugation Configuration Panel — Pronoun Selection](#us-q4-conjugation-configuration-panel--pronoun-selection)
5. [US-Q5: AI-Powered Conjugation — Correct Answer Generation](#us-q5-ai-powered-conjugation--correct-answer-generation)
6. [US-Q6: AI-Powered Conjugation — Wrong Answers for QCM](#us-q6-ai-powered-conjugation--wrong-answers-for-qcm)
7. [US-Q7: AI-Generated Wrong Answers for All QCM Modes](#us-q7-ai-generated-wrong-answers-for-all-qcm-modes)
8. [US-Q8: Synonym-Based Questions](#us-q8-synonym-based-questions)
9. [US-Q9: Question Count Validation Against Database](#us-q9-question-count-validation-against-database)
10. [US-Q10: Saved Quiz Presets — "My Quizzes"](#us-q10-saved-quiz-presets--my-quizzes)
11. [US-Q11: Backward Navigation During Quiz](#us-q11-backward-navigation-during-quiz)
12. [US-Q12: Conjugation Answer Format Rules](#us-q12-conjugation-answer-format-rules)
13. [US-Q13: Conjugation AI Prompt Engineering](#us-q13-conjugation-ai-prompt-engineering)

---

## US-Q1: Tense Mapping Data Files

**Priority:** High
**Complexity:** Low
**Dependencies:** None
**Files to create:**
- `src/data/tenses-fr.json`
- `src/data/tenses-es.json`
- `src/lib/tenses.ts` (mapping utility)

### Description

Create two JSON files defining the tense lists for French and Spanish (Rioplatense), and a mapping utility that links each French tense to its Spanish equivalent. The gerund must be included in both.

### Tense Mapping Table

| Français (key) | Label FR | Espagnol (key) | Label ES (Rioplatense) |
|---|---|---|---|
| `present` | Présent | `presente` | Presente |
| `passe_compose` | Passé composé | `preterito_indefinido` | Pretérito indefinido |
| `imparfait` | Imparfait | `imperfecto` | Imperfecto |
| `plus_que_parfait` | Plus-que-parfait | `pluscuamperfecto` | Pluscuamperfecto |
| `passe_simple` | Passé simple | `preterito_indefinido` | Pretérito indefinido |
| `futur_simple` | Futur simple | `futuro_simple` | Futuro simple |
| `futur_proche` | Futur proche | `ir_a_infinitif` | ir a + infinitif |
| `conditionnel` | Conditionnel | `condicional` | Condicional |
| `subjonctif` | Subjonctif | `subjuntivo` | Subjuntivo |
| `gerondif` | Gérondif | `gerundio` | Gerundio |

### Acceptance Criteria

- [ ] `src/data/tenses-fr.json` contains an array of `{ key: string, label: string }` for all 10 French tenses
- [ ] `src/data/tenses-es.json` contains an array of `{ key: string, label: string }` for all 10 Spanish tenses (Rioplatense labels)
- [ ] `src/lib/tenses.ts` exports:
  - `TENSE_MAP_FR_TO_ES`: `Record<string, string>` — maps French tense key → Spanish tense key
  - `TENSE_MAP_ES_TO_FR`: `Record<string, string>` — reverse mapping
  - `getTensesForLocale(locale: "fr" | "es"): TenseEntry[]` — returns the appropriate array
  - `getCorrespondingTense(tenseKey: string, from: LangCode, to: LangCode): string` — returns the equivalent tense key in the other language
- [ ] Gerund (`gerondif` / `gerundio`) is included in both files
- [ ] All types are exported for use in `QuizConfig` and prompt builders
- [ ] No hardcoded tense values in `src/lib/quiz.ts` — replace existing `TENSES` array with imports from this module

### Technical Notes

- `passe_compose` and `passe_simple` both map to `preterito_indefinido`. The reverse mapping (`ES → FR`) should map `preterito_indefinido` to `passe_compose` (primary). The AI prompt must handle the nuance.
- `futur_proche` maps to `ir_a_infinitif` which is a periphrastic form, not a morphological tense. The AI prompt must know this means "ir a + infinitive" construction.

---

## US-Q2: Conjugation Configuration Panel — Tense Selection

**Priority:** High
**Complexity:** Medium
**Dependencies:** US-Q1
**Files to modify:**
- `src/app/dashboard/practice/setup/page.tsx`
- `src/lib/quiz.ts` (extend `QuizConfig`)
- `src/types/index.ts`
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

When the user selects **Conjugation mode** in the quiz setup page (`/dashboard/practice/setup?mode=conjugation`), the configuration panel must display a **tense selector dropdown**. The user can choose a specific tense or leave it as "All tenses" (random selection during quiz).

### UI Specification

- **Location:** New card section below the "Format" card, visible ONLY when `mode === "conjugation"`
- **Component:** A `<select>` dropdown populated from `getTensesForLocale(locale)`
- **Default value:** "All tenses" (random)
- **Options:** Each tense label from the appropriate locale file
- **Styling:** Same pattern as the existing Category dropdown (rounded-xl, border-franol-warm, focus:border-franol-accent-blue)

### Data Flow

```
User selects tense → state: selectedTense (string | "all")
                    → QuizConfig.tense?: string
                    → Passed to generateQuiz() or AI API
```

### Acceptance Criteria

- [ ] A "Tense" dropdown card appears when `mode === "conjugation"`, animated with `animate-slide-up`
- [ ] Dropdown is populated from `getTensesForLocale(locale)` — labels are translated per portal
- [ ] Default option is "All tenses" with value `"all"`
- [ ] Selected tense is stored in `QuizConfig.tense` (optional field)
- [ ] The `QuizConfig` type is extended: `tense?: string` (key from tenses JSON, e.g. `"present"`)
- [ ] Translation keys added: `practice.setup.tense`, `practice.setup.allTenses`
- [ ] Both `fr.json` and `es.json` are updated
- [ ] Responsive: full-width on mobile, works within the `max-w-2xl` container

---

## US-Q3: Conjugation Configuration Panel — Verb Group Selection

**Priority:** High
**Complexity:** Medium
**Dependencies:** None (uses existing `VERB_GROUPS_FR`, `VERB_GROUPS_ES` from `constants.ts`)
**Files to modify:**
- `src/app/dashboard/practice/setup/page.tsx`
- `src/lib/quiz.ts` (extend `QuizConfig`)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

In the conjugation setup panel, add a **verb group selector** that lets the user filter by French group (1st/2nd/3rd) or Spanish group (-AR/-ER/-IR). The groups shown should correspond to the **source language** of the quiz direction.

### UI Specification

- **Location:** New card section below "Tense" card (or combined in the same card), visible ONLY when `mode === "conjugation"`
- **Component:** Button group (like the Format selector) with group options
- **Options:** Derived from `VERB_GROUPS_FR` or `VERB_GROUPS_ES` based on the **source language** of the direction
  - Direction `fr-to-es` → show French groups: 1er groupe (-er), 2ème groupe (-ir), 3ème groupe
  - Direction `es-to-fr` → show Spanish groups: -AR, -ER, -IR
- **Default:** "All groups" (no filter)

### Data Flow

```
User selects group → state: selectedGroup (string | "all")
                   → QuizConfig.verbGroup?: string
                   → Used to filter conjugations query in generateQuiz()
```

### Acceptance Criteria

- [ ] A "Verb Group" button group appears when `mode === "conjugation"`
- [ ] Group labels change based on quiz direction (FR groups for FR→ES, ES groups for ES→FR)
- [ ] Default selection: "All groups" with value `"all"`
- [ ] Selected group stored in `QuizConfig.verbGroup?: string`
- [ ] `QuizConfig` type extended accordingly
- [ ] In `generateQuiz()`, conjugation query filters by `group_fr` or `group_es` when specified
- [ ] Translation keys added: `practice.setup.verbGroup`, `practice.setup.allGroups`
- [ ] Responsive: wraps on mobile using `flex-wrap gap-3`

---

## US-Q4: Conjugation Configuration Panel — Pronoun Selection

**Priority:** High
**Complexity:** Medium
**Dependencies:** None
**Files to modify:**
- `src/app/dashboard/practice/setup/page.tsx`
- `src/lib/quiz.ts` (extend `QuizConfig`)
- `src/lib/constants.ts` (add pronoun constants)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

Add a **pronoun selector** to the conjugation configuration panel. The user can choose a specific pronoun to practice with, or leave it as "All pronouns" (random selection during quiz).

### UI Specification

- **Location:** New card section, visible ONLY when `mode === "conjugation"`
- **Component:** Button group or dropdown with pronoun options
- **Pronouns by language:**

| Index | FR Portal (learning ES) | ES Portal (learning FR) |
|---|---|---|
| 1 | yo | je/j' |
| 2 | tú | tu |
| 3 | él/ella | il/elle |
| 4 | nosotros | nous |
| 5 | vosotros | vous |
| 6 | ellos/ellas | ils/elles |

- **Default:** "All pronouns" (random)
- **Optional:** Include "vos" for Rioplatense variant (treated as an alias for tú in conjugation, or as a separate entry)

### Data Flow

```
User selects pronoun → state: selectedPronoun (string | "all")
                     → QuizConfig.pronoun?: string
                     → Used to constrain AI conjugation generation
```

### Acceptance Criteria

- [ ] A "Pronoun" selector appears when `mode === "conjugation"`
- [ ] Pronoun labels adapt to the quiz direction (ES pronouns for FR→ES, FR pronouns for ES→FR)
- [ ] Default: "All pronouns" with value `"all"`
- [ ] Selected pronoun stored in `QuizConfig.pronoun?: string` (stores the pronoun string itself, e.g. `"tu"`)
- [ ] Pronoun constants added to `src/lib/constants.ts`:
  - `PRONOUNS_FR: string[]`
  - `PRONOUNS_ES: string[]`
- [ ] Remove hardcoded `PRONOUNS_ES` / `PRONOUNS_FR` from `src/lib/quiz.ts` — import from constants
- [ ] Translation keys: `practice.setup.pronoun`, `practice.setup.allPronouns`
- [ ] Responsive: horizontal scroll or wrap on mobile

---

## US-Q5: AI-Powered Conjugation — Correct Answer Generation

**Priority:** Critical
**Complexity:** High
**Dependencies:** US-Q1, US-Q2, US-Q4
**Files to modify:**
- `src/lib/quiz.ts` (refactor conjugation mode)
- `src/lib/ai.ts` (add conjugation generation function)
- `src/app/api/ai/generate-batch/route.ts` (or new dedicated route)
- `src/lib/prompts/fr/quiz.ts` (add conjugation prompts)
- `src/lib/prompts/es/quiz.ts` (add conjugation prompts)
- `src/lib/prompts/types.ts` (extend params)
- `src/lib/prompts/index.ts` (add dispatch)

### Description

For conjugation mode, the AI must generate the **correct conjugated form** of a verb. The flow is:

1. Select a random infinitive verb from the `conjugations` table
2. Select a random tense (unless user specified one)
3. Select a random pronoun (unless user specified one)
4. Ask the AI to conjugate the verb in the selected tense + pronoun → this becomes the correct answer
5. The question shows: `[pronoun] + [infinitive in source language]` and asks for the conjugation

### Architecture

```
generateQuiz() → conjugation branch:
  1. Fetch conjugations from DB (filtered by verbGroup if specified)
  2. Select random verbs
  3. For each verb:
     a. Pick random tense (or use user's selection)
     b. Pick random pronoun (or use user's selection)
     c. Build AI prompt: "Conjugate [infinitive] in [tense] for [pronoun]"
     d. AI returns the correct conjugated form
     e. Build QuizQuestion with:
        - questionText: "[Pronoun_source] → Conjugate: [infinitive_source]"
        - correctAnswer: "[pronoun_target] [conjugated_form_target]" (ES portal) or "[conjugated_form_target]" (FR portal, see US-Q12)
  4. Return questions
```

### AI Prompt Guidelines

The prompt must be added to the dedicated prompt files:
- `src/lib/prompts/fr/quiz.ts` → new `buildConjugationPrompt()` function
- `src/lib/prompts/es/quiz.ts` → new `buildConjugationPrompt()` function

**FR Portal Prompt (learning Spanish):**
```
System: Tu es un expert en conjugaison française-espagnole.
Tu dois conjuguer le verbe donné au temps et au pronom spécifiés.
Réponds UNIQUEMENT avec la forme conjuguée, sans explication.

User: Conjugue le verbe espagnol "comer" au "presente" pour "yo"
→ Response: "yo como"
```

**ES Portal Prompt (learning French):**
```
System: Sos un expert en conjugación español-francés.
Tenés que conjugar el verbo dado en el tiempo y pronombre especificados.
Respondé SOLO con la forma conjugada, sin explicación.

User: Conjuga el verbo francés "manger" al "présent" para "je"
→ Response: "je mange"
```

### Acceptance Criteria

- [ ] New function `generateAIConjugation()` in `src/lib/ai.ts`:
  - Takes: infinitive (FR + ES), tense, pronoun, direction, locale
  - Returns: `{ conjugatedForm: string, pronoun: string }`
- [ ] New API route or extension of existing `/api/ai/generate-batch` for conjugation
- [ ] Conjugation prompts added to both `fr/quiz.ts` and `es/quiz.ts`
- [ ] `src/lib/quiz.ts` `generateQuiz()` conjugation branch completely refactored:
  - No longer uses the infinitive as both question and answer
  - Calls AI to generate the actual conjugated form
  - Respects `config.tense` and `config.pronoun` from QuizConfig
- [ ] The `tense` field on `QuizQuestion` stores the **tense key** (e.g. `"present"`) not a display label
- [ ] The `pronoun` field on `QuizQuestion` stores the target-language pronoun used
- [ ] AI response is validated (non-empty, plausible conjugation)
- [ ] Error handling: fallback to infinitive if AI fails (with a warning logged)
- [ ] Tense labels in the quiz UI are localized using the tense data files

---

## US-Q6: AI-Powered Conjugation — Wrong Answers for QCM

**Priority:** High
**Complexity:** High
**Dependencies:** US-Q5
**Files to modify:**
- `src/lib/ai.ts` (extend conjugation generation)
- `src/lib/prompts/fr/quiz.ts` (add wrong answer prompts)
- `src/lib/prompts/es/quiz.ts` (add wrong answer prompts)

### Description

For QCM format in conjugation mode, the AI must generate **3 wrong answers** that:
- Use the **same pronoun** as the correct answer
- Are conjugated in **any tense EXCEPT** the target tense
- Are plausible conjugations of the same verb (or a similar verb)

### Rules

**Example rule:**
If the user practices **passé composé** with **"tu"**:
- **Correct answer:** `tu as mangé` (passé composé)
- **Wrong answers:** `tu mangeais` (imparfait), `tu mangeras` (futur), `tu as mangé` (passé composé) ← NO, this is the same tense

**Strict rule:**
- Wrong answers MUST keep the **same pronoun**
- Wrong answers MUST use a **different tense** than the correct answer
- Wrong answers should be **plausible** (real conjugations, not gibberish)

### Acceptance Criteria

- [ ] AI prompt for conjugation wrong answers enforces same pronoun, different tense
- [ ] Wrong answers are validated: they must differ from the correct answer and from each other
- [ ] The AI generates exactly 3 wrong answers per question
- [ ] Prompt is in the dedicated prompt files (`fr/quiz.ts`, `es/quiz.ts`)
- [ ] Fallback: if AI returns fewer than 3 wrong answers, retry once; if still failing, use hardcoded fallback patterns

---

## US-Q7: AI-Generated Wrong Answers for All QCM Modes

**Priority:** High
**Complexity:** High
**Dependencies:** None (can be developed in parallel with US-Q5/Q6)
**Files to modify:**
- `src/lib/quiz.ts` (refactor `getWrongAnswers()`)
- `src/lib/ai.ts` (add `generateWrongAnswers()` function)
- `src/app/api/ai/generate-batch/route.ts` (or new `/api/ai/wrong-answers` route)
- `src/lib/prompts/fr/quiz.ts` (add wrong answer prompt)
- `src/lib/prompts/es/quiz.ts` (add wrong answer prompt)

### Description

For all QCM quiz modes (classic, vocabulary, expressions), the wrong answers should be **generated by AI** instead of randomly pulled from the database. The wrong answers must follow these rules:

1. **Correct answers ALWAYS come from the database**
2. **Wrong answers are generated by AI** and should be:
   - Sometimes **semantically close** (e.g., "Holi" for "Hola")
   - Sometimes **orthographically similar** (e.g., "Graçias" for "Gracias")
   - Sometimes **completely different but same word type**
3. Wrong answers should never be the correct answer or an alias

### Example

**Question:** "Bonjour"
**Correct answer:** "Hola" (from database)
**Wrong answers (AI-generated):** ["Holi", "Ciao", "Gracias"]

### Architecture

```
getWrongAnswers() refactored:
  1. Receive: correctAnswer, questionText, type, target language
  2. Call AI: "Generate 3 plausible but incorrect translations for [word]"
     - Rules: same language as answer, same word type, semantically or orthographically close
  3. Return: string[] (3 wrong answers)

  Fallback: if AI fails → fall back to current database-based random answers
```

### Prompt Guidelines

Add to prompt files:

**FR Portal:**
```
System: Tu génères des réponses incorrectes mais plausibles pour un quiz de traduction.
Règles:
- 3 réponses fausses pour la bonne réponse donnée
- Même langue que la bonne réponse
- Même type de mot (nom, verbe, expression...)
- Au moins 1 réponse sémantiquement proche
- Au moins 1 réponse orthographiquement proche
- Jamais la bonne réponse ou un synonyme de celle-ci
Format: JSON array de 3 strings ["faux1", "faux2", "faux3"]
```

### Acceptance Criteria

- [ ] New function `generateWrongAnswersAI()` in `src/lib/ai.ts`
- [ ] Dedicated API route `/api/ai/wrong-answers` (POST)
- [ ] `getWrongAnswers()` in `quiz.ts` refactored: calls AI first, falls back to DB random if AI fails
- [ ] Wrong answers never equal the correct answer (case-insensitive check)
- [ ] Wrong answers never equal any alias of the correct answer
- [ ] Wrong answers are deduplicated (no two identical answers)
- [ ] AI prompt is in the dedicated prompt files
- [ ] Performance: wrong answer generation should be batched (generate all questions' wrong answers in one AI call when possible)
- [ ] Loading state: quiz shows loading indicator while wrong answers are generated

---

## US-Q8: Synonym-Based Questions

**Priority:** High
**Complexity:** Very High
**Dependencies:** US-Q7 (AI wrong answers)
**Files to modify:**
- `src/lib/quiz.ts` (add synonym question generation logic)
- `src/lib/quiz.ts` (add synonym detection)
- `src/app/dashboard/practice/quiz/page.tsx` (track used answers)
- `src/types/index.ts` (extend QuizQuestion)

### Description

A sophisticated question generation system that:

1. **Sometimes uses synonyms as the expected answer** instead of the exact database translation
2. **Generates synonym-based follow-up questions** asking for alternative ways to say something
3. **Prevents duplicate answers** — if a user already gave a specific synonym as an answer, it's marked incorrect on the next occurrence

### Rules

**Rule 1: Synonym as expected answer**
- When generating a question, the system may replace the `correctAnswer` with one of the item's aliases
- The original `correctAnswer` becomes an alias (accepted but not the primary expected answer)
- This is controlled by a probability factor (e.g., 30% of questions use a synonym)

**Rule 2: Synonym follow-up questions**
- After asking "estoy en pedo" → "Je suis saoul", the next question may be:
  - "Comment peux-tu dire autrement 'estoy en pedo' ?"
  - Correct answer: any OTHER synonym of "Je suis saoul" (e.g., "Je suis bourré")
  - The answer "Je suis saoul" (already used) is marked INCORRECT

**Rule 3: Cross-entry synonym matching**
- If two vocabulary entries share the same translation (e.g., "salut" = "hola" AND "bonjour" = "hola"), these are treated as synonyms
- The system should detect these overlaps and use them for question generation

### Data Model Extension

```typescript
// Extend QuizQuestion
interface QuizQuestion {
  // ... existing fields
  isSynonymQuestion?: boolean;        // true if this is a "say it differently" question
  originalQuestionText?: string;       // the original word/expression that was asked before
  usedAnswers?: string[];              // answers already given for this item, marked incorrect if reused
  allAcceptedAnswers?: string[];       // ALL valid answers (correctAnswer + aliases + cross-entry matches)
}
```

### Logic: Cross-Entry Synonym Detection

```typescript
function findSynonymGroups(items: ContentItem[]): Map<string, string[]> {
  // Group items by their translation (target language)
  // e.g., "hola" → ["salut", "bonjour", "coucou"]
  // These become accepted synonyms for each other
}
```

### Acceptance Criteria

- [ ] New function `generateSynonymQuestion()` in `src/lib/quiz.ts`:
  - Takes: original question, synonyms, used answers
  - Returns: a new QuizQuestion of type "synonym"
- [ ] Quiz generation: ~30% of questions may use a synonym as the expected answer
- [ ] Synonym follow-up questions generated with probability (e.g., 20% chance after a correctly answered question)
- [ ] "Say it differently" question text is localized:
  - FR: "Comment peux-tu dire autrement '[word]' ?"
  - ES: "¿Cómo podés decir de otra manera '[word]'?"
- [ ] Used answers are tracked per quiz session — reusing an answer is marked incorrect
- [ ] All aliases of the correct answer are accepted (via `checkAnswer()`)
- [ ] Cross-entry synonym detection: entries sharing the same translation are linked
- [ ] Translation keys: `practice.quiz.sayDifferently`, `practice.quiz.alreadyUsedAnswer`
- [ ] `QuizQuestion` type extended with `isSynonymQuestion`, `usedAnswers`, `allAcceptedAnswers`
- [ ] This feature does NOT apply to conjugation mode (only vocabulary and expressions)

---

## US-Q9: Question Count Validation Against Database

**Priority:** High
**Complexity:** Medium
**Dependencies:** US-Q8 (for synonym count expansion)
**Files to modify:**
- `src/app/dashboard/practice/setup/page.tsx`
- `src/lib/quiz.ts` (add count validation)

### Description

Before launching a quiz (all modes EXCEPT discovery mode), the system must check whether enough content exists in the database to fulfill the requested question count. If insufficient items exist:

1. **Adjust the question count** to the maximum available
2. **Factor in synonyms** — if items have aliases, the system can reuse the same items with different expected answers
3. **Show a notification** to the user explaining the adjustment

### Calculation Logic

```typescript
async function calculateMaxQuestions(config: QuizConfig): Promise<{
  maxQuestions: number;
  uniqueItems: number;
  synonymExpanded: number;
  adjusted: boolean;
}> {
  // 1. Count matching items in DB (filtered by mode, category, etc.)
  const items = await fetchMatchingItems(config);
  const uniqueItems = items.length;

  // 2. Count synonym-expanded questions
  let synonymExpanded = 0;
  for (const item of items) {
    // Primary answer = 1 question
    // Each alias that differs from primary = +1 possible question
    const aliases = getLangArray(item, "aliases", targetLang);
    synonymExpanded += 1 + aliases.length;

    // Cross-entry synonyms (items sharing the same translation)
    // → reuse the same item with a different expected answer
  }

  // 3. Max = min(config.questionCount, synonymExpanded)
  // But each ANSWER must be unique (no asking the same answer twice)
  return {
    maxQuestions: Math.min(config.questionCount, synonymExpanded),
    uniqueItems,
    synonymExpanded,
    adjusted: config.questionCount > synonymExpanded,
  };
}
```

### User Flow

1. User configures: 50 questions, vocabulary, category "Animal"
2. System checks: only 23 vocabulary words in "Animal" category
3. System calculates synonym expansion: 23 words × ~2 synonyms avg = ~46 possible questions
4. System adjusts: quiz will have **46 questions** (not 50)
5. User sees a toast/info: `"Only 46 unique questions available for this configuration (23 words + synonyms). Quiz adjusted to 46 questions."`

### Acceptance Criteria

- [ ] New function `calculateMaxQuestions()` in `src/lib/quiz.ts`
- [ ] Called when user clicks "Start" in setup page (before navigating to quiz)
- [ ] If `adjusted === true`, show a dismissible info banner to the user
- [ ] Quiz config `questionCount` is silently adjusted to the calculated max
- [ ] The calculation accounts for:
  - DB item count (filtered by mode, category, verb group)
  - Alias count per item
  - Cross-entry synonym overlaps
  - Unique answer constraint (no duplicate expected answers)
- [ ] Minimum 1 question required — if 0 items match, show error and prevent quiz start
- [ ] Discovery mode is exempt from this check (AI generates content)
- [ ] Translation keys: `practice.setup.adjustedCount`, `practice.setup.noContent`, `practice.setup.availableQuestions`

---

## US-Q10: Saved Quiz Presets — "My Quizzes"

**Priority:** Medium
**Complexity:** High
**Dependencies:** None (database changes first)
**Files to create:**
- `src/app/api/quiz-presets/route.ts` (CRUD API)
- `src/components/practice/QuizPresetCard.tsx` (display component)
**Files to modify:**
- `src/components/practice/PracticeContent.tsx` (rename "Custom" → "My Quizzes", add preset section)
- `src/lib/quiz.ts` (add preset types)
- `src/types/index.ts` (add QuizPreset type)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

Replace the disabled "Custom" button with **"My Quizzes"** ("Mes quiz" / "Mis quizzes"). Users can save quiz configurations as presets and launch them instantly.

### Database Schema

Provide the SQL script in a dedicated section. The user will implement it manually.

```sql
CREATE TABLE quiz_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- User-given name for the preset
  mode VARCHAR(50) NOT NULL,            -- classic, vocabulary, expressions, conjugation
  format VARCHAR(20) NOT NULL,          -- qcm, translation, mixed
  question_count INTEGER NOT NULL DEFAULT 10,
  category VARCHAR,                     -- category UUID or null
  direction VARCHAR(20) NOT NULL,       -- fr-to-es, es-to-fr
  tense VARCHAR(50),                    -- tense key or null (conjugation only)
  pronoun VARCHAR(20),                  -- pronoun or null (conjugation only)
  verb_group VARCHAR(20),               -- verb group key or null (conjugation only)
  prompt TEXT,                          -- discovery prompt or null
  locale VARCHAR(5) NOT NULL,           -- fr or es
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: No user accounts yet, so no RLS. Will be updated in v2.
ALTER TABLE quiz_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on quiz_presets" ON quiz_presets FOR ALL USING (true) WITH CHECK (true);
```

### UI Specification

**Practice Page (`/dashboard/practice`):**

1. **"Custom" button → "My Quizzes"** ("Mes quiz" / "Mis quizzes")
   - No longer disabled — now clickable
   - Icon changes from `Lock` to `Bookmark` or `List`
   - Clicking opens a section below the mode grid OR navigates to a dedicated page

2. **"My Favorite Quizzes" section** below the mode cards:
   - Grid of saved presets as compact cards
   - Each card shows:
     - Preset name (user-given)
     - Mode icon + format badge
     - Question count
     - Category (if applicable)
     - Direction indicator (FR→ES or ES→FR)
     - **"Launch" button** (one-click quiz start)
     - **"Delete" button** (with confirmation)
   - **"Save current config"** CTA after completing a quiz (on results page)

**Save Flow:**
1. User configures and completes a quiz
2. On results page, a "Save this configuration" button appears
3. Clicking opens a modal with:
   - Name input (required)
   - Preview of the configuration
   - "Save" button
4. Preset is saved to `quiz_presets` table

**Launch Flow:**
1. User clicks "Launch" on a preset card
2. System reconstructs `QuizConfig` from preset data
3. Navigates directly to quiz page (skipping setup)

### Acceptance Criteria

- [ ] "Custom" button renamed to "My Quizzes" ("Mes quiz" / "Mis quizzes") in both portals
- [ ] Button is clickable (no longer disabled)
- [ ] "My Favorite Quizzes" section displayed on practice page
- [ ] Empty state: "No saved quizzes yet. Complete a quiz and save its configuration!"
- [ ] Save preset modal with name input + configuration preview
- [ ] Launch preset → reconstruct QuizConfig → start quiz immediately
- [ ] Delete preset with confirmation modal (reuse `ConfirmModal`)
- [ ] SQL script provided separately for manual DB creation
- [ ] Translation keys: `practice.modes.myQuizzes`, `practice.modes.myQuizzesDesc`, `practice.presets.title`, `practice.presets.save`, `practice.presets.launch`, `practice.presets.delete`, `practice.presets.empty`, `practice.presets.saveName`
- [ ] `QuizPreset` type added to `src/types/index.ts`
- [ ] API route `/api/quiz-presets` with GET, POST, DELETE
- [ ] Responsive: preset cards grid is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

### SQL Script (for user to execute manually)

```sql
-- =====================================================
-- Quiz Presets Table
-- Execute this manually in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS quiz_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  category VARCHAR,
  direction VARCHAR(20) NOT NULL,
  tense VARCHAR(50),
  pronoun VARCHAR(20),
  verb_group VARCHAR(20),
  prompt TEXT,
  locale VARCHAR(5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow all (no user accounts yet)
ALTER TABLE quiz_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on quiz_presets" ON quiz_presets
  FOR ALL USING (true) WITH CHECK (true);

-- Index for faster queries by locale
CREATE INDEX idx_quiz_presets_locale ON quiz_presets(locale);
```

---

## US-Q11: Backward Navigation During Quiz

**Priority:** Medium
**Complexity:** Medium
**Dependencies:** None
**Files to modify:**
- `src/app/dashboard/practice/quiz/page.tsx` (main refactoring)

### Description

During a quiz, the user must be able to **navigate back to previous questions** while:
- Keeping their results visible (correct/incorrect indicator)
- Keeping explanations clickable (for AI-generated questions)
- All navigation occurs **within the same page** (no route changes)

### UI Specification

- **Back button:** Add a "Previous" (`ArrowLeft`) button next to the "Next" button in the `answered` state
- **Question counter:** Shows current position: "Question 5 sur 20"
- **Visited question indicators:** Small dots or numbers at the top showing which questions have been answered (green = correct, red = incorrect, gray = not visited)

### State Management

```typescript
// Current state uses currentIndex + answers array
// Backward navigation just decrements currentIndex
// Previous answers are already stored in answers[]

// When navigating to an already-answered question:
// - Show the QCM options with the user's selection highlighted
// - Show correct/incorrect indicators
// - Show the explanation if it was previously loaded
// - Disable interaction (can't change answers)
```

### Navigation Bar Design

```
[←] [1] [2] [3] [4] [5] ... [20] [→]
      ✓   ✗   ✓   ✓   ✓
```

- Scrollable horizontal indicator showing question positions
- Color-coded: green dot (correct), red dot (incorrect), gray dot (unvisited)
- Current question highlighted with blue ring
- Clickable: user can jump to any answered question
- Non-answered questions cannot be jumped to (only sequential forward)

### Acceptance Criteria

- [ ] "Previous" button appears when `currentIndex > 0` and state is `answered`
- [ ] Clicking "Previous" decrements `currentIndex` — no new API calls
- [ ] Previous questions show:
  - The user's selected/written answer (highlighted)
  - Correct/incorrect indicator (same as when first answered)
  - Explanation if previously loaded (or "Explain" button still works)
- [ ] User **cannot change** answers on previous questions (inputs disabled)
- [ ] Question progress indicator (dots/numbers) in the header area
  - Green for correct, red for incorrect, gray for unanswered
  - Current position highlighted
  - Clickable for answered questions (jump to)
- [ ] "Next" button on the last answered question remains "Next" (not "See results") until the user is on the last question
- [ ] Keyboard navigation: Left/Right arrows navigate between questions when in `answered` state
- [ ] The quiz completion logic only triggers when the user is on the LAST question and clicks "Next"
- [ ] `localStorage` save is updated when navigating (crash recovery preserved)
- [ ] Responsive: question indicator wraps or scrolls horizontally on mobile
- [ ] Translation keys: `practice.quiz.previous`, `practice.quiz.questionN` (for dot tooltips)

---

## US-Q12: Conjugation Answer Format Rules

**Priority:** High
**Complexity:** Low
**Dependencies:** US-Q5
**Files to modify:**
- `src/lib/quiz.ts` (answer validation for conjugation)
- `src/lib/levenshtein.ts` (extend `checkAnswer` for conjugation)
- `src/app/dashboard/practice/quiz/page.tsx` (answer display)

### Description

Define strict answer format rules for conjugation questions based on the portal language.

### Rules

**ES Portal (learning French):**
- Expected answer format: **`[pronoun] + [conjugated verb]`**
- Reason: In French, the pronoun is **always mandatory** to understand the conjugation
- Example: `"je mange"`, `"tu manges"`, `"il mange"`
- The Levenshtein tolerance should apply to the ENTIRE string (pronoun + verb)

**FR Portal (learning Spanish):**
- Expected answer format: **`[conjugated verb]`** OR **`[pronoun] + [conjugated verb]`**
- Reason: In Spanish, verb endings are more distinctive, so the pronoun is optional
- Example: `"como"` is accepted, `"yo como"` is also accepted
- If user writes just the verb, compare against the conjugated verb only
- If user writes pronoun + verb, compare against the full form

### Implementation

```typescript
function checkConjugationAnswer(
  input: string,
  correctAnswer: string,   // "yo como" or "je mange"
  pronoun: string,         // "yo" or "je"
  locale: "fr" | "es",
): boolean {
  if (locale === "es") {
    // Learning French → pronoun mandatory
    // Compare full string with tolerance
    return checkAnswer(input, correctAnswer, []);
  } else {
    // Learning Spanish → pronoun optional
    // Try 1: Full match (pronoun + verb)
    if (checkAnswer(input, correctAnswer, [])) return true;
    // Try 2: Verb only (extract verb from correctAnswer)
    const verbOnly = correctAnswer.replace(pronoun, "").trim();
    return checkAnswer(input, verbOnly, []);
  }
}
```

### Acceptance Criteria

- [ ] `checkConjugationAnswer()` function added to `src/lib/levenshtein.ts`
- [ ] ES portal: answer must include pronoun + conjugated verb
- [ ] FR portal: answer accepted with OR without pronoun
- [ ] The quiz page uses `checkConjugationAnswer()` for conjugation-type questions
- [ ] Answer placeholder text adapts:
  - FR portal: `"Conjuguez (ex: como)"`
  - ES portal: `"Conjuga (ex: je mange)"`
- [ ] Translation keys: `practice.quiz.conjugationPlaceholder`

---

## US-Q13: Conjugation AI Prompt Engineering

**Priority:** High
**Complexity:** Medium
**Dependencies:** US-Q1, US-Q5, US-Q6
**Files to modify:**
- `src/lib/prompts/fr/quiz.ts` (add conjugation prompt builders)
- `src/lib/prompts/es/quiz.ts` (add conjugation prompt builders)
- `src/lib/prompts/types.ts` (add ConjugationPromptParams)

### Description

Create dedicated prompt builder functions for conjugation mode, separate from the existing vocabulary/expression quiz prompts. These prompts must strictly follow the tense mapping and answer format rules.

### New Types

```typescript
// src/lib/prompts/types.ts
export interface ConjugationPromptParams {
  infinitiveFr: string;
  infinitiveEs: string;
  tenseKey: string;           // e.g., "present", "passe_compose"
  tenseLabel: string;         // localized label
  pronoun: string;            // target language pronoun
  pronounIndex: number;       // 0-5 index for disambiguation
  direction: string;          // fr-to-es or es-to-fr
  locale: Locale;
  generateWrongAnswers: boolean; // if QCM format, also generate wrong answers
  excludedTenses?: string[];  // tenses to exclude from wrong answers
}
```

### Prompt Structure

**System Prompt (FR Portal, learning Spanish):**
```
Tu es un expert en conjugaison des verbes français et espagnols (variante rioplatense).
Tu dois générer la conjugaison EXACTE d'un verbe.

RÈGLES STRICTES:
1. Le temps demandé doit être RESPECTÉ (ne pas confondre passé composé et imparfait)
2. Le pronom doit être respecté (ne pas conjuguer à la 3e personne si on demande la 1re)
3. Pour le gérondif, utilise la forme en -ando/-iendo
4. Pour le futur proche, utilise la structure "ir a + infinitif"
5. Réponds UNIQUEMENT avec le JSON demandé

FORMAT DE SORTIE (JSON):
{
  "correct": "[pronom] [forme conjuguée]",
  "wrongAnswers": ["[pronom] [forme autre temps 1]", "[pronom] [forme autre temps 2]", "[pronom] [forme autre temps 3]"],
  "tenseUsed": "[nom du temps en espagnol]"
}
```

**User Prompt Example:**
```
Verbe: "comer" (français: "manger")
Temps: presente (Présent)
Pronom: yo (1re personne du singulier)
Direction: français → espagnol

Génère la conjugaison en espagnol.
Les 3 mauvaises réponses doivent utiliser le MÊME pronom "yo" mais un temps DIFFÉRENT du presente.
```

### Acceptance Criteria

- [ ] `buildConjugationPrompt()` function added to both `fr/quiz.ts` and `es/quiz.ts`
- [ ] `ConjugationPromptParams` type added to `types.ts`
- [ ] Prompt dispatcher in `index.ts` updated with `getConjugationPrompts()`
- [ ] System prompt includes:
  - Tense rules (strict respect of requested tense)
  - Pronoun rules (exact match required)
  - Wrong answer generation rules (same pronoun, different tense)
  - JSON output format specification
  - Rioplatense variants (vos form when applicable)
- [ ] Tense names in prompts use the MAPPING from US-Q1 (not hardcoded)
- [ ] The prompt specifies the tense label in BOTH languages for clarity
- [ ] Prompts are testable independently (can be called from a test script)

---

## Implementation Order

```
Phase 1 — Foundation (no UI changes)
├── US-Q1: Tense mapping data files
├── US-Q13: Conjugation AI prompt engineering
└── US-Q12: Conjugation answer format rules

Phase 2 — Conjugation Mode Overhaul
├── US-Q2: Tense selection UI
├── US-Q3: Verb group selection UI
├── US-Q4: Pronoun selection UI
├── US-Q5: AI-powered conjugation (correct answers)
└── US-Q6: AI-powered conjugation (wrong answers)

Phase 3 — AI Wrong Answers (all modes)
└── US-Q7: AI-generated wrong answers for all QCM modes

Phase 4 — Advanced Question Generation
├── US-Q8: Synonym-based questions
└── US-Q9: Question count validation

Phase 5 — UX Enhancements
├── US-Q10: Saved quiz presets ("My Quizzes")
└── US-Q11: Backward navigation
```

---

## Summary

| US | Title | Priority | Complexity | Dependencies |
|---|---|---|---|---|
| US-Q1 | Tense Mapping Data Files | High | Low | None |
| US-Q2 | Tense Selection UI | High | Medium | US-Q1 |
| US-Q3 | Verb Group Selection UI | High | Medium | None |
| US-Q4 | Pronoun Selection UI | High | Medium | None |
| US-Q5 | AI Conjugation — Correct Answers | Critical | High | US-Q1, Q2, Q4 |
| US-Q6 | AI Conjugation — Wrong Answers | High | High | US-Q5 |
| US-Q7 | AI Wrong Answers (All Modes) | High | High | None |
| US-Q8 | Synonym-Based Questions | High | Very High | US-Q7 |
| US-Q9 | Question Count Validation | High | Medium | US-Q8 |
| US-Q10 | Saved Quiz Presets | Medium | High | None (DB first) |
| US-Q11 | Backward Navigation | Medium | Medium | None |
| US-Q12 | Conjugation Answer Format | High | Low | US-Q5 |
| US-Q13 | Conjugation AI Prompts | High | Medium | US-Q1 |

**Total:** 13 user stories
