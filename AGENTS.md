# Frañol — Agent Development Guide

> **Project:** Bilingual language learning app (French ↔ Spanish)
> **Stack:** Next.js 14 App Router · React 18 · TypeScript · Supabase · Tailwind CSS 3.4 · Google Gemini AI
> **Architecture:** Server Components + Client Components, SSR-optimized

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Description](#2-functional-description)
3. [Technical Architecture](#3-technical-architecture)
4. [Project Structure](#4-project-structure)
5. [Mandatory Best Practices](#5-mandatory-best-practices)
6. [Responsive Design (MANDATORY)](#6-responsive-design-mandatory)
7. [Component Architecture & Reusability](#7-component-architecture--reusability)
8. [Shared Resources](#8-shared-resources)
9. [Agent Delegation Guide](#9-agent-delegation-guide)
10. [Standard Workflows](#10-standard-workflows)
11. [Build & Dev Commands](#11-build--dev-commands)
12. [Commit Guidelines](#12-commit-guidelines)
13. [Portal Component Guidelines](#13-portal-component-guidelines)
14. [Responsive Bug Patterns & Fixes](#14-responsive-bug-patterns--fixes)
15. [User Story Files](#15-user-story-files)

---

## 1. Project Overview

**Frañol** is a bilingual language learning application that helps users learn either **Spanish** (from French) or **French** (from Spanish, specifically Rioplatense/Argentine Spanish).

### Key Features

- **Content Management** — Add, edit, delete vocabulary words, expressions, and verb conjugations organized by categories
- **AI-Powered Quizzes** — 6 practice modes including AI-generated discovery quizzes on any theme
- **Smart Answer Validation** — Levenshtein distance tolerance for typos + alias matching
- **Pedagogical Explanations** — AI-generated explanations for correct/incorrect answers
- **Fun Facts** — Cultural and linguistic fun facts about both languages (~90 per locale)
- **Bilingual Interface** — Full UI translations in French and Spanish (Argentine variant)

### User Journey

```
Landing Page (/) → Select Language (FR/ES) → Login (/login) → Dashboard (/dashboard)
                                                         │
                                            ┌────────────┼────────────┐
                                            ▼            ▼            ▼
                                    Add Content    Manage Content    Practice
                                    (/dashboard    (/dashboard      (/dashboard
                                     /add)          /content)        /practice)
```

---

## 2. Functional Description

### Authentication

- **Single-password system** — No user accounts. One shared `APP_PASSWORD` env var.
- **Cookie-based session** — `franol-session` httpOnly cookie, base64-encoded JSON, 24h TTL.
- **Middleware protection** — All `/dashboard/*` and `/api/*` routes require a valid session. Public routes: `/`, `/login`, `/api/auth/*`.

### Content Addition (`/dashboard/add`)

Four tabs for adding learning content:

| Tab | Fields | Special Features |
|-----|--------|-----------------|
| **Vocabulary** | word_fr, word_es, articles (dropdown), aliases, category, notes | Article dropdowns (Le/La/L'/Un/Une...), duplicate detection |
| **Expressions** | expression_fr, expression_es, aliases, context, notes | Context dropdown with create-new |
| **Verbs** | infinitive_fr/es, aliases, groups (FR: 1/2/3, ES: AR/ER/IR), irregular, reflexive, category, notes | Bilingual verb group dropdowns |
| **History** | All previously added items | Grouped by date, delete option |

**Duplicate Detection:** Before any insert, `checkDuplicate()` compares against all existing items + aliases (case-insensitive). Shows a warning with "Add anyway" option.

### Content Management (`/dashboard/content`)

- **Filters:** Search bar, type multi-select (vocabulary/expressions/verbs/categories), advanced filters (category, context, date range)
- **Content cards** with type icon, FR/ES labels, category badge, alias count, edit/delete actions
- **Full edit modal** with all fields per item type + verified checkbox
- **Delete confirmation** modal with item preview

### Practice Flow

**6 Practice Modes:**

| Mode | Source | Description |
|------|--------|-------------|
| Classic | Database | Mix of vocabulary + expressions |
| Vocabulary | Database | Only vocabulary items |
| Expressions | Database | Only expressions |
| Conjugation | Database | Only verb conjugations |
| Discovery (AI) | Gemini AI | AI-generated questions on any theme |
| Custom | — | Coming soon (disabled) |

**Quiz Configuration** (`/dashboard/practice/setup`):
- Question count: 10/20/30/custom (5-50)
- Format: QCM (multiple choice), Translation (free text), Mixed
- Category filter (not for conjugation)
- Direction: FR→ES or ES→FR

**Discovery Mode** (`/dashboard/practice/discovery`):
- Free-form prompt (e.g., "15 mots sur la cuisine argentine")
- Auto-parses question count from prompt text
- Direction selector

**Quiz Execution** (`/dashboard/practice/quiz`):
- QCM: 4 shuffled options, exact match
- Translation: Free text with Levenshtein tolerance (1 char for <5 char words, 2 chars otherwise) + alias matching
- Discovery mode: "Explain" button for AI-generated pedagogical explanations
- State persisted to localStorage for crash recovery
- Fun facts displayed during AI loading

**Results** (`/dashboard/practice/results`):
- Score (percentage + count), duration, emoji feedback
- Error review with user answer vs correct answer
- Discovery mode: Batch vocabulary extraction with one-click add to database
- Actions: Retry, new questions (with excluded words), new quiz

### Internationalization

- Two portals: French (learning Spanish) and Spanish (learning French, Rioplatense variant)
- `useLocale()` hook provides `locale`, `t()`, `sourceLang`, `targetLang`
- Translation keys use dot notation: `t("dashboard.welcome")`
- Spanish portal uses Argentine vocabulary (colectivo, heladera, etc.) and voseo

---

## 3. Technical Architecture

### Stack Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 14.x |
| UI | React + TypeScript | 18.x / 5.x |
| Styling | Tailwind CSS | 3.4 |
| Database | Supabase (PostgreSQL) | via @supabase/ssr |
| AI | Google Gemini | gemini-3-flash-preview via @google/genai |
| Icons | lucide-react | 0.468 |
| Package Manager | **pnpm** | 10.x (**MANDATORY** — never npm/yarn) |

### Architecture Patterns

#### Server vs Client Components

**Server Components (default — always prefer):**
- Data fetching from Supabase
- No browser APIs needed
- No React hooks needed

**Client Components (only when necessary):**
- React hooks (useState, useEffect, useCallback, etc.)
- User interactions (onClick, onChange, onSubmit)
- Browser APIs (localStorage, window, etc.)
- Context consumption (useLocale)

**Core Pattern:**
```typescript
// page.tsx (Server Component — default, no directive needed)
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("vocabulary").select("*");
  return <ClientComponent initialData={data} />;
}

// ClientComponent.tsx (Client Component — only when needed)
"use client";
import { useState } from "react";

export function ClientComponent({ initialData }: { initialData: VocabularyItem[] }) {
  const [data, setData] = useState(initialData);
  // Interactive logic here
}
```

#### Authentication Architecture

```
Middleware (src/middleware.ts)
  ├── Public routes: /, /login, /api/auth/* → pass through
  └── Protected routes: /dashboard/*, /api/* → validate franol-session cookie
        ├── Valid → continue
        └── Invalid → redirect to / (with ?redirect= for dashboard routes)
                    → return 401 JSON (for API routes)
```

- Session stored in `franol-session` httpOnly cookie: base64 JSON `{ authenticated: true, timestamp }`, 24h TTL
- Password validated against `APP_PASSWORD` env var via `/api/auth/login`
- Logout clears cookie, localStorage locale, and saved quiz data

#### AI Integration Architecture (Google Gemini)

```
Client Component (quiz page)
  → generateAIQuizBatchWithStream() from @/lib/ai
    → POST /api/ai/generate-batch
      → GoogleGenAI SDK
        → ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userPrompt,
            config: { systemInstruction, temperature, maxOutputTokens, responseMimeType }
          })
      → 3-tier JSON parsing (direct → repair → regex extraction)
      → validateQuestion() for each result
    ← JSON response { questions, totalCount }
```

- **API key:** `GEMINI_API_KEY` environment variable
- **SDK:** `@google/genai` → `new GoogleGenAI({ apiKey })` → `ai.models.generateContent()`
- **JSON mode:** `config.responseMimeType: "application/json"` for structured quiz output
- **3 fallback parsers:** Direct JSON parse → JSON repair (fix brackets/quotes) → manual regex extraction

#### State Management

| State Type | Storage | Use Case |
|-----------|---------|----------|
| Locale | localStorage | Language preference persistence |
| Quiz config | sessionStorage | Quiz setup between pages |
| Quiz state | localStorage | Crash recovery (`savedQuiz`) |
| Quiz results | sessionStorage | Results page data |
| Auth session | httpOnly cookie | 24h authenticated session |
| UI state | React useState | Component-level interactions |

### Database Schema (Supabase — PostgreSQL)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `vocabulary` | `word_fr`, `word_es`, `article_fr/es`, `aliases_fr/es[]`, `category`, `notes`, `verified` | French-Spanish word pairs |
| `expressions` | `expression_fr`, `expression_es`, `aliases_fr/es[]`, `context`, `notes`, `verified` | Idiomatic expressions |
| `conjugations` | `infinitive_fr/es`, `aliases_fr/es[]`, `group_fr/es`, `is_irregular`, `is_reflexive_fr/es`, `category`, `notes`, `verified` | Verb entries |
| `categories` | `name_fr`, `name_es`, `type` (vocabulary\|expression\|conjugation\|lesson), `color`, `icon` | Content organization |
| `quiz_history` | `quiz_type`, `quiz_mode`, `total_questions`, `correct_answers`, `score_percentage`, `duration_seconds`, `questions_data` (jsonb) | Quiz results |

All tables have `id` (uuid), `created_at`, and `updated_at` columns.

---

## 4. Project Structure

```
src/
├── app/                              # Next.js 14 App Router
│   ├── page.tsx                      # Landing page (Client — language selection)
│   ├── login/page.tsx                # Login (Client — password form)
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard layout + Navigation (Server)
│   │   ├── page.tsx                  # Dashboard home (Server wrapper → DashboardContent)
│   │   ├── add/page.tsx              # Add content (Client — 4 tabs)
│   │   ├── content/page.tsx          # Content management (Client — filters, CRUD)
│   │   └── practice/
│   │       ├── page.tsx              # Practice mode selector (Server → PracticeContent)
│   │       ├── setup/page.tsx        # Quiz configuration (Client)
│   │       ├── quiz/page.tsx         # Active quiz session (Client)
│   │       ├── results/page.tsx      # Post-quiz results (Client)
│   │       └── discovery/page.tsx    # AI discovery entry (Server → DiscoveryContent)
│   ├── api/
│   │   ├── auth/                     # login, logout, check (cookie-based)
│   │   └── ai/                       # generate-quiz, generate-batch, explanation (Gemini)
│   ├── layout.tsx                    # Root layout (Server — wraps LocaleProvider)
│   └── globals.css                   # Global styles + Tailwind directives
│
├── components/
│   ├── ui/                           # Shared UI components (app-wide)
│   │   ├── Navigation.tsx            #   Sidebar (desktop) + bottom bar (mobile)
│   │   ├── CustomDropdown.tsx        #   Portal-based dropdown with fixed positioning
│   │   ├── CustomDatePicker.tsx      #   Portal-based calendar with viewport clamping
│   │   ├── ConfirmModal.tsx          #   Reusable confirm dialog (danger/warning/info)
│   │   └── FunFacts.tsx              #   Random language fun facts display
│   ├── home/                         # Landing page components
│   │   ├── LanguageButton.tsx        #   FR/ES selection button with gradient
│   │   └── FlagTicker.tsx            #   Animated flag ticker
│   ├── dashboard/                    # Dashboard home components
│   │   ├── DashboardContent.tsx      #   Stats + quick actions + changelog
│   │   └── Changelog.tsx             #   Version release notes
│   ├── add/                          # Add page form components
│   │   ├── VocabularyForm.tsx        #   Vocabulary addition form
│   │   ├── ExpressionForm.tsx        #   Expression addition form
│   │   ├── VerbForm.tsx              #   Verb addition form
│   │   └── DuplicateWarning.tsx      #   Duplicate detection warning banner
│   ├── content/                      # Content management components
│   │   ├── ContentCard.tsx           #   Vocabulary/expression/verb card
│   │   ├── CategoryCard.tsx          #   Category display card
│   │   ├── AdvancedFilters.tsx       #   Filter panel (category, context, dates)
│   │   └── EditModal.tsx             #   Full edit modal for any content type
│   ├── practice/                     # Practice page components
│   │   ├── PracticeContent.tsx       #   Practice mode selector grid
│   │   ├── DiscoveryContent.tsx      #   AI discovery prompt form
│   │   ├── VocabularyModal.tsx       #   Post-quiz vocabulary batch-add modal
│   │   └── QuitModal.tsx             #   Quiz quit confirmation
│   └── forms/                        # Reusable form inputs
│       └── AliasInput.tsx            #   Tag-style alias add/remove input
│
├── contexts/
│   └── LocaleContext.tsx             # i18n (locale, t(), sourceLang, targetLang, localStorage)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   └── server.ts                 # Server client (createServerClient + cookies)
│   ├── ai.ts                         # AI wrapper (generateAIQuizBatchWithStream, getAIExplanation)
│   ├── quiz.ts                       # Quiz engine (generateQuiz, scoring, state types)
│   ├── levenshtein.ts                # Typo-tolerant answer validation
│   ├── duplicates.ts                 # Duplicate detection (checkDuplicate)
│   ├── lang.ts                       # Language abstraction (LangCode, getLangValue, QuizDirection)
│   ├── constants.ts                  # Shared constants (articles, verb groups)
│   ├── utils.ts                      # cn() utility (clsx + tailwind-merge)
│   └── prompts/                      # Centralized AI prompts
│       ├── index.ts                  #   Dispatcher (getQuizPrompts, getExplanationPrompts)
│       ├── types.ts                  #   PromptPair, QuizPromptParams, Locale
│       ├── fr/quiz.ts                #   French portal quiz prompts
│       ├── fr/explanation.ts         #   French portal explanation prompts
│       ├── es/quiz.ts                #   Spanish portal quiz prompts (Rioplatense)
│       └── es/explanation.ts         #   Spanish portal explanation prompts
│
├── translations/
│   ├── fr.json                       # French UI translations (dot-notation keys)
│   └── es.json                       # Spanish UI translations
│
├── types/
│   └── index.ts                      # Shared TypeScript types & form defaults
│
└── data/
    ├── fun-facts-fr.json             # ~90 fun facts (French about Spanish)
    ├── fun-facts-es.json             # ~90 fun facts (Spanish about French)
    └── releases.ts                   # Version release notes
```

---

## 5. Mandatory Best Practices

> **These rules MUST be followed at ALL times. Violations are NOT acceptable.**

### Next.js App Router

```typescript
// ✅ GOOD — Server Component (default, no directive needed)
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("vocabulary").select("*");
  return <ClientComponent initialData={data} />;
}

// ✅ GOOD — Client Component (only when hooks/interactivity needed)
"use client";
import { useState } from "react";

export function ClientComponent({ initialData }: { initialData: VocabularyItem[] }) {
  const [data, setData] = useState(initialData);
  return <div>{/* interactive UI */}</div>;
}
```

**Rules:**
- **NEVER** add `"use client"` unless the component needs hooks, browser APIs, event handlers, or context
- **ALWAYS** fetch data in Server Components when possible — use `async/await` directly in the component
- **ALWAYS** use `export const dynamic = 'force-dynamic'` for pages that need fresh data
- **NEVER** access `localStorage` or `sessionStorage` in Server Components (causes hydration errors)
- **ALWAYS** use `NextRequest`/`NextResponse` in API routes with proper `try/catch` error handling
- **ALWAYS** use `force-dynamic` for API routes that should not be cached

### React

```typescript
// ✅ GOOD — Explicit typed props, one component per file, named export
interface CardProps {
  title: string;
  description?: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export function Card({ title, description, onClick, variant = "primary" }: CardProps) {
  return (
    <div className={cn("rounded-xl p-4", variant === "primary" ? "bg-white" : "bg-franol-sand")} onClick={onClick}>
      <h3 className="font-display text-franol-text">{title}</h3>
      {description && <p className="text-franol-muted">{description}</p>}
    </div>
  );
}
```

**Rules:**
- **ALWAYS** define explicit TypeScript interfaces for all component props
- **NEVER** use `any` type — use explicit types, `unknown`, or generics
- **ALWAYS** use named exports (`export function Component`) — avoid default exports
- **ALWAYS** use `interface` for object types, `type` for unions/intersections
- **ALWAYS** use `useCallback` for functions passed as props to child components
- **NEVER** exceed 300 lines per component — extract sub-components
- **ALWAYS** use `import type { ... }` for type-only imports
- **ALWAYS** destructure props in the function signature
- **ALWAYS** provide sensible defaults for optional props

### Tailwind CSS

```typescript
// ✅ GOOD — Mobile-first responsive, custom Frañol colors, cn() for conditionals
<div className={cn(
  "flex flex-col gap-4 p-4 rounded-xl bg-franol-cream border border-franol-warm",
  "md:flex-row md:p-6 md:gap-6",  // Desktop overrides
  isActive && "ring-2 ring-franol-accent-blue"
)}>
```

**Rules:**
- **NEVER** use inline `style={{}}` — **ALWAYS** use Tailwind utility classes
- **NEVER** use CSS modules — Tailwind only
- **ALWAYS** write mobile-first: base classes for mobile, then `sm:` / `md:` / `lg:` for larger screens
- **ALWAYS** use `cn()` from `@/lib/utils` for conditional class merging
- **ALWAYS** use the custom Frañol color palette (never raw hex colors):

| Color | Value | Usage |
|-------|-------|-------|
| `franol-cream` | #FDFBF7 | Main background |
| `franol-sand` | #F5F0E8 | Light accent / cards |
| `franol-warm` | #E8DFD0 | Borders |
| `franol-text` | #2D2A26 | Primary text |
| `franol-muted` | #6B6560 | Secondary text |
| `franol-accent-blue` | #1E3A8A | Primary actions / links |
| `franol-accent-red` | #DC2626 | Danger / destructive actions |
| `franol-accent-yellow` | #FBBF24 | Warning / caution |

- **ALWAYS** use `font-display` (Georgia, serif) for headings, `font-body` (system-ui) for body text
- **ALWAYS** use custom animations: `animate-fade-in`, `animate-slide-up`, `animate-scroll-left`, `animate-scroll-right`

### TypeScript

```typescript
// ✅ GOOD — Strict types everywhere
import type { VocabularyItem, Category } from "@/types";

interface FormProps {
  item: VocabularyItem;
  categories: Category[];
  onSubmit: (data: VocabularyItem) => Promise<void>;
  isLoading: boolean;
}

export async function handleSubmit(formData: FormData): Promise<VocabularyItem> {
  const item: VocabularyItem = { /* ... */ };
  return item;
}

// ❌ BAD — implicit any
export function handleSubmit(formData) {  // Error: no type annotation
  return formData.get("word");            // Error: implicit any
}
```

**Rules:**
- **NEVER** use `any` — use explicit types, `unknown`, or generics
- **ALWAYS** use `import type { ... }` for type-only imports
- **ALWAYS** type all function parameters and return types
- **ALWAYS** import shared types from `@/types` — never define inline in components
- **ALWAYS** use `interface` for object shapes, `type` for unions

### Supabase

```typescript
// ✅ GOOD — Browser context (Client Components)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// ✅ GOOD — Server context (Server Components, API routes)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// ❌ BAD — Never import from bare path
import { createClient } from "@/lib/supabase";  // WRONG — file doesn't exist
```

**Rules:**
- **NEVER** import from `@/lib/supabase` directly — **ALWAYS** use `/client` or `/server`
- **ALWAYS** handle errors from Supabase queries (`const { data, error } = await ...`)
- **ALWAYS** use the server client in Server Components and API routes (reads cookies)
- **ALWAYS** use the browser client in Client Components (uses document.cookie)

### Error Handling

```typescript
// API Routes — always use try/catch with user-friendly messages
try {
  const result = await someOperation();
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error("Context about what failed:", error);
  return NextResponse.json(
    { error: "User-friendly message" },
    { status: 500 }
  );
}

// Client Components — catch and set user-facing error state
try {
  await fetchData();
} catch (error) {
  console.error("Error fetching data:", error);
  setError("Something went wrong. Please try again.");
}
```

### Code Style

**Import Order:** External → Internal → Types

```typescript
import { useState, useCallback } from "react";           // External
import { useRouter } from "next/navigation";               // External
import { useLocale } from "@/contexts/LocaleContext";       // Internal
import { cn } from "@/lib/utils";                           // Internal
import type { QuizConfig } from "@/lib/quiz";               // Types
import type { Category } from "@/types";                    // Types
```

**Use `@/` path alias for ALL internal imports:**
```typescript
// ✅ GOOD
import { createClient } from "@/lib/supabase/client";

// ❌ BAD
import { createClient } from "../../lib/supabase/client";
```

**Naming Conventions:**

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `Navigation`, `ContentCard` |
| Functions | camelCase | `handleSubmit`, `fetchData` |
| Files (components) | PascalCase | `Navigation.tsx`, `AliasInput.tsx` |
| Files (utilities) | kebab-case | `quiz.ts`, `ai.ts` |
| Constants | UPPER_SNAKE_CASE | `GEMINI_API_KEY`, `ARTICLES_FR` |
| Types/Interfaces | PascalCase | `QuizConfig`, `ContentItem` |
| CSS classes | Tailwind utilities only | `bg-franol-cream`, `text-franol-text` |

### Translations (i18n)

```typescript
const { t, locale } = useLocale();
return (
  <h1>{t("dashboard.welcome")}</h1>
  <p>{t("practice.setup.title")}</p>
);
```

**Rules:**
- **ALWAYS** use `t()` from `useLocale()` for all user-facing text
- **NEVER** hardcode UI strings — always use translation keys
- Translation keys use dot notation matching the JSON structure in `src/translations/fr.json` and `es.json`

---

## 6. Responsive Design (MANDATORY)

> **Every page and component MUST work perfectly on both mobile and desktop. Responsive design is NOT optional — it is a hard requirement.**

### Breakpoints (Tailwind defaults)

| Breakpoint | Min Width | Target |
|-----------|-----------|--------|
| (default) | 0px | Mobile phones |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops / desktops |
| `xl:` | 1280px | Large screens |

### Mobile-First Approach

**ALWAYS** write the mobile layout as the base (no prefix), then add responsive overrides:

```typescript
// ✅ GOOD — Mobile first
<div className="
  flex flex-col gap-2 p-3          /* Mobile: stacked, compact padding */
  md:flex-row md:gap-4 md:p-6      /* Tablet+: side by side, spacious */
  lg:max-w-4xl lg:mx-auto          /* Desktop: centered, max-width */
">
```

### Layout Patterns

**Navigation:** Desktop = fixed sidebar | Mobile = fixed bottom bar
```typescript
// Navigation adapts automatically (see src/components/ui/Navigation.tsx)
// Desktop: fixed left sidebar, hidden on mobile
// Mobile: fixed bottom navigation bar
```

**Forms:** Stack on mobile, side-by-side on desktop
```typescript
// ✅ GOOD
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField label="Français" />
  <FormField label="Español" />
</div>
```

**Cards/Lists:** Single column mobile → multi-column desktop
```typescript
// ✅ GOOD
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <ContentCard key={item.id} item={item} />)}
</div>
```

**Modals:** Full-width on mobile, centered with max-width on desktop
```typescript
// ✅ GOOD
<div className="w-full max-w-md mx-4 md:mx-auto">
  {/* Modal content */}
</div>
```

### Touch Targets

- **Minimum 44×44px** for all interactive elements on mobile
- Adequate spacing between clickable elements (minimum `gap-2`)
- Use `p-3` or larger padding on buttons and interactive elements
- Ensure form inputs have sufficient height (`h-10` minimum)

### Common Responsive Utilities

```typescript
// Hide on mobile, show on desktop
<div className="hidden md:block">

// Show on mobile, hide on desktop
<div className="md:hidden">

// Responsive text size
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Responsive padding
<section className="p-4 md:p-6 lg:p-8">

// Responsive flex direction
<div className="flex flex-col md:flex-row">

// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 7. Component Architecture & Reusability

> **ALWAYS create reusable components. NEVER duplicate code. A clean architecture is MANDATORY.**

### When to Extract a Component

Extract immediately when:
1. **Code is duplicated** across 2+ files → Extract to `components/ui/` or `components/forms/`
2. **File exceeds size limits** → Extract logical sections into separate components
3. **Logical separation exists** → Forms, modals, lists, cards should be separate components
4. **Reusability is possible** → If it could be used elsewhere, extract it now

### File Size Limits

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Page components | 400 | Extract forms, modals, sections into components |
| UI components | 200 | Split into smaller components |
| Utility files | 300 | Split into focused modules |
| API routes | 150 | Extract validation/helpers |

### Component Organization

```
src/components/
├── ui/           # Generic, app-wide reusable components
│                  #   Navigation, ConfirmModal, FunFacts
│                  #   If used in 2+ feature folders, it belongs here
├── forms/        # Reusable form input components
│                  #   AliasInput, future: TextInput, Select, DatePicker
│                  #   Always controlled components (value + onChange props)
├── home/         # Landing page specific components
├── dashboard/    # Dashboard home specific components
├── add/          # Add page specific form components
├── content/      # Content management specific components
└── practice/     # Practice flow specific components
```

### Component Patterns

**Form Component — controlled via props:**
```typescript
interface VocabularyFormProps {
  form: VocabFormState;
  categories: Category[];
  sourceLang: LangCode;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: string, value: string | string[]) => void;
  onOpenCategoryModal: () => void;
}

export function VocabularyForm({ form, categories, sourceLang, isLoading, onSubmit, onFieldChange, onOpenCategoryModal }: VocabularyFormProps) {
  const { t } = useLocale();
  return <form onSubmit={onSubmit}>{/* form fields */}</form>;
}
```

**Modal Component — controlled via show/onClose:**
```typescript
interface CategoryModalProps {
  show: boolean;
  isSaving: boolean;
  form: { name_fr: string; name_es: string; color: string };
  onClose: () => void;
  onFieldChange: (field: string, value: string) => void;
  onCreate: () => void;
}

export function CategoryModal({ show, onClose, onFieldChange, onCreate, form, isSaving }: CategoryModalProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">{/* modal content */}</div>
    </div>
  );
}
```

**Card Component — self-contained display:**
```typescript
interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}

export function ContentCard({ item, onEdit, onDelete }: ContentCardProps) {
  const { t, locale } = useLocale();
  return (
    <div className="bg-white rounded-xl p-4 border border-franol-warm hover:shadow-md transition-shadow">
      {/* Card content — responsive layout */}
    </div>
  );
}
```

---

## 8. Shared Resources

> **ALWAYS import from central locations. NEVER duplicate types, constants, or utilities.**

### Types — `@/types`

```typescript
import type {
  Category, VocabularyItem, ExpressionItem, ConjugationItem,
  ContentItem, HistoryItem, CategoryDisplayItem, DisplayItem,
  VocabFormState, ExpressionFormState, VerbFormState,
} from "@/types";

// Default form values
import { defaultVocabForm, defaultExpressionForm, defaultVerbForm } from "@/types";
```

### Constants — `@/lib/constants`

```typescript
import { ARTICLES_FR, ARTICLES_ES, VERB_GROUPS_FR, VERB_GROUPS_ES } from "@/lib/constants";
```

### Duplicate Detection — `@/lib/duplicates`

```typescript
import { checkDuplicate, type DuplicateMatch } from "@/lib/duplicates";

const duplicates = await checkDuplicate("vocabulary", wordFr, wordEs, aliasesFr, aliasesEs);
```

### Alias Input — `@/components/forms/AliasInput`

```typescript
import { AliasInput } from "@/components/forms/AliasInput";

<AliasInput
  aliases={form.aliases_fr}
  onAdd={(alias) => onFieldChange("aliases_fr", [...form.aliases_fr, alias])}
  onRemove={(index) => onFieldChange("aliases_fr", form.aliases_fr.filter((_, i) => i !== index))}
  placeholder={t("add.aliasPlaceholder")}
/>
```

### cn Utility — `@/lib/utils`

```typescript
import { cn } from "@/lib/utils";

<div className={cn("p-4 rounded-xl", isActive && "bg-franol-accent-blue")} />
```

### Language Utilities — `@/lib/lang`

```typescript
import type { LangCode } from "@/lib/lang";
import { getLangValue, getLangArray } from "@/lib/lang";
```

---

## 9. Agent Delegation Guide

### Available Agents

| Agent | Role | When to Call |
|-------|------|-------------|
| **@brainstormer** | Product ideation | Vague or open-ended requests; need feature ideas, UX improvements, market opportunities |
| **@planner** | Task decomposition | Before any feature implementation; complex task breakdown into user stories; feasibility analysis |
| **@coder** | Implementation | After planning is complete; implementing features, fixing bugs, refactoring code |
| **@tester** | Quality assurance | After each user story implementation; regression testing after bug fixes |
| **@code-reviewer** | Code audit | After significant code changes; security reviews; performance audits; before merging important features |
| **@code-simplifier** | Code quality | When code is overly complex; after refactoring; when files exceed size limits |

### Agent Descriptions

**@brainstormer — Product Ideation**
- Generates feature enrichment ideas, UX improvements, and market opportunities
- Call when the user request is vague or open-ended and needs creative input
- Do NOT call for specific, well-defined tasks

**@planner — Task Decomposition & Planning**
- Decomposes objectives into numbered user stories with acceptance criteria
- Studies technical feasibility and identifies dependencies between tasks
- Estimates complexity and suggests implementation order
- Call for any feature that requires more than a single file change
- Do NOT call for trivial tasks (e.g., "change this color")

**@coder — Feature Implementation**
- Writes production code following ALL best practices defined in this document
- Implements user stories one by one with proper TypeScript types
- Follows the component architecture rules (reusability, file size limits, responsive design)
- Prerequisites: Must have approved user stories or clear technical specifications

**@tester — Quality Assurance**
- Generates and executes unit/integration/e2e tests
- Verifies acceptance criteria are met
- Reports test coverage and identifies gaps
- Note: This project currently has no test framework — manual testing is required

**@code-reviewer — Code Audit**
- Audits for: security vulnerabilities, performance issues, maintainability, anti-patterns
- Checks: TypeScript type safety, component reusability, responsive design compliance
- Validates adherence to ALL best practices defined in this document
- Call after significant code changes or before merging important features

**@code-simplifier — Code Quality**
- Simplifies code while preserving all functionality
- Improves readability, reduces duplication, enforces consistent patterns
- Call when code has become overly complex or when files exceed size limits

### Decision Tree

```
User Request
  │
  ├─ Is it vague/open-ended?
  │   └── @brainstormer → clarify → continue below
  │
  ├─ Is it a NEW FEATURE?
  │   └── @planner (decompose into user stories)
  │         → User validates plan
  │         → @coder (implement US by US)
  │         → @tester (verify each US)
  │         → @code-reviewer (audit)
  │
  ├─ Is it a BUGFIX?
  │   └── @planner (analyze + fix plan)
  │         → @coder (fix)
  │         → @tester (regression)
  │         → @code-reviewer (validate fix)
  │
  ├─ Is it an AUDIT?
  │   └── @code-reviewer (full audit)
  │         → @planner (findings → user stories)
  │         → User prioritization
  │
  └─ Is it REFACTORING?
      └── @code-simplifier (simplify)
            → @code-reviewer (verify)
```

### Coordination Rules

1. **NEVER** do the work of a specialized agent yourself — always delegate
2. Each delegation must include **full context** (relevant file paths, current code, requirements)
3. **Request user validation** before proceeding on structurally significant decisions
4. **Parallelize when possible** (e.g., tests + review can run in parallel after implementation)
5. If an agent fails, **reformulate the request** or propose an alternative approach
6. Maintain a **dependency graph** — do not assign tasks whose prerequisites are incomplete

---

## 10. Standard Workflows

### New Feature

```
1. @brainstormer  → Clarification & ideation (if objective is vague)
2. @planner       → Decomposition into user stories + feasibility study
3. User validation of the plan
4. @coder         → Implementation user story by user story
5. @tester        → Test generation after each implemented user story
6. @code-reviewer → Audit of produced code
7. @code-simplifier → Simplification if needed
```

### Bugfix

```
1. @planner       → Bug analysis + fix plan
2. @coder         → Fix implementation
3. @tester        → Regression tests
4. @code-reviewer → Fix validation
```

### Audit

```
1. @code-reviewer → Full audit (security, performance, maintainability, responsive design)
2. @planner       → Transform findings into prioritized user stories
3. User prioritization
```

### Progress Reporting

At each key milestone, report:
- **Completed tasks** and their status
- **Current task** and assigned agent
- **Upcoming tasks** in the queue
- **Blockers** or decisions needed from the user

---

## 11. Build & Dev Commands

```bash
# Package manager — ALWAYS pnpm, NEVER npm or yarn
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (http://localhost:3000)
pnpm build                # Production build
pnpm start                # Run production server
pnpm lint                 # ESLint
npx tsc --noEmit          # TypeScript type check (no test framework configured)

# Clean build (if issues arise)
rm -rf .next node_modules pnpm-lock.yaml && pnpm install && pnpm build
```

**Note:** No test framework is configured yet. Manual testing is required until one is set up.

---

## 12. Commit Guidelines

```bash
# Format: type: brief description (focus on WHY, not WHAT)
git commit -m "feat: add vocabulary export feature"
git commit -m "fix: correct quiz scoring calculation"
git commit -m "refactor: extract AliasInput to shared component"
git commit -m "docs: update AGENTS.md with Gemini architecture"
```

**Types:** `feat` · `fix` · `refactor` · `docs` · `style` · `test` · `chore`

---

## Common Pitfalls

1. **Don't use `npm` or `yarn`** — Always use `pnpm` (enforced by `packageManager` field)
2. **Don't import from bare `@/lib/supabase`** — Use `/client` or `/server` versions
3. **Don't add `"use client"` unless necessary** — Server Components are default and faster
4. **Don't access `localStorage` in Server Components** — Will cause hydration errors
5. **Don't forget to restart dev server** after changing `.env` variables
6. **Don't use `console.log` in production code** — Remove before committing
7. **Don't hardcode UI strings** — Always use `t()` from `useLocale()`
8. **Don't use raw hex colors** — Always use Frañol palette class names
9. **Don't write desktop-only layouts** — Every component MUST be responsive
10. **Don't duplicate code** — Extract into shared components immediately

---

**Last Updated:** 2026 — Phase 4 (Gemini migration + comprehensive architecture documentation)

---

## 13. Portal Component Guidelines

> Portal-based components (CustomDropdown, CustomDatePicker) render their popup content via `createPortal(element, document.body)`. This section documents the MANDATORY patterns for these components.

### Positioning: `position: fixed` (MANDATORY)

All portal popups MUST use `position: fixed` with viewport-relative coordinates. **NEVER use `position: absolute`** with scroll-based coordinates — it breaks on scroll and mobile viewports.

```typescript
// ✅ CORRECT — position: fixed with viewport coords
const updatePosition = useCallback(() => {
  if (buttonRef.current) {
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;
    let width = Math.max(280, rect.width);
    if (width > viewportWidth - 16) width = viewportWidth - 16;
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }

    let top = rect.bottom + 6;
    if (top + 320 > viewportHeight) {
      top = rect.top - 320 - 6;
    }

    return { top, left, width };
  }
  return { top: 0, left: 0, width: 280 };
}, []);

// Portal rendering
{isOpen && createPortal(
  <div ref={popupRef} style={{ position: "fixed", top, left, width, zIndex: 9999 }}>
    {/* popup content */}
  </div>,
  document.body
)}
```

```typescript
// ❌ WRONG — position: absolute with scroll coords (breaks on mobile/scroll)
style={{
  position: "absolute",
  top: rect.bottom + window.scrollY,  // breaks on scroll
  left: rect.left + window.scrollX,   // breaks on mobile
}}
```

### Viewport Clamping Rules

1. **Width:** Clamp to `viewportWidth - 16` minimum margin
2. **Left:** If `left + width > viewportWidth - 8`, shift left to `viewportWidth - width - 8`
3. **Top:** Default below button. If popup overflows bottom, flip above button
4. **Minimum left:** Never less than `8px`

### Scroll & Resize Handling

Portal components MUST update position on scroll and resize:

```typescript
useEffect(() => {
  if (isOpen) {
    setPopupPosition(updatePosition());
    const handler = () => setPopupPosition(updatePosition());
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }
}, [isOpen, updatePosition]);
```

### Click-Outside Detection

Must check both the trigger container AND the portal popup:

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!containerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
      setIsOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

---

## 14. Responsive Bug Patterns & Fixes

> Common responsive issues encountered and their solutions. Always reference these before implementing new components.

### Pattern 1: Horizontal Overflow from Child Elements

**Symptom:** Page scrolls horizontally on mobile even when layout looks correct.

**Root Cause:** A child element (buttons, filters, cards) has a wider `scrollWidth` than its parent's `clientWidth`.

**Fix:**

```tsx
// Dashboard layout — overflow guard
<div className="min-h-screen bg-franol-cream overflow-x-hidden">
  <main className="pb-20 md:pb-0 md:pl-64 overflow-x-hidden">{children}</main>
</div>

// Page containers — min-w-0 + overflow-x-hidden
<div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-w-0 overflow-x-hidden">
```

**Debug Script (run in browser console):**

```javascript
(() => {
  const html = document.documentElement;
  console.log("Overflow:", html.scrollWidth > html.clientWidth,
    `scroll=${html.scrollWidth} client=${html.clientWidth}`);
  document.querySelectorAll("main *").forEach(el => {
    if (el.scrollWidth > (el.parentElement?.clientWidth || 0) + 2) {
      console.log("OVERFLOW:", el.tagName, el.className?.substring(0, 80),
        `scrollW=${el.scrollWidth}`);
    }
  });
})();
```

### Pattern 2: Filter Buttons Bar Overflow

**Symptom:** Horizontal row of filter/type buttons causes the page to scroll horizontally.

**Fix:** Use `overflow-x-auto` + `hide-scrollbar` + `flex-shrink-0` on each button:

```tsx
<div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
  {buttons.map(btn => (
    <button className="... flex-shrink-0 whitespace-nowrap">{btn.label}</button>
  ))}
</div>
```

**Critical:** The parent container MUST have `min-w-0` and/or `overflow-x-hidden` to prevent the `overflow-x-auto` child from pushing the page wider.

### Pattern 3: Portal Popup Off-Screen on Mobile

**Symptom:** Dropdown or calendar popup renders partially or fully outside the viewport on mobile.

**Fix:** See [Portal Component Guidelines](#13-portal-component-guidelines) — always use `position: fixed` with viewport clamping.

### Pattern 4: Content Cards Not Centered

**Symptom:** Cards are off-center or overflow on small screens.

**Fix:**

```tsx
// Always use max-w + mx-auto for centered containers
<div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-w-0">

// Card grids — responsive columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Individual cards — min-w-0 to prevent flex overflow
<div className="bg-white rounded-xl p-4 border border-franol-warm min-w-0">
```

### Pattern 5: Navigation Bar Horizontal Scroll on Mobile

**Symptom:** The mobile bottom navigation bar scrolls horizontally or items overflow.

**Fix:** Use `justify-around` with flexible items:

```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-franol-warm z-50">
  <div className="flex items-center justify-around py-2">
    {items.map(item => (
      <Link className="flex flex-col items-center gap-1 px-3 py-2">
        <Icon size={22} />
        <span className="text-xs font-medium">{label}</span>
      </Link>
    ))}
  </div>
</nav>
```

---

## 15. User Story Files

User stories are organized in markdown files at the project root:

| File | Category | Stories | Status |
|------|----------|---------|--------|
| `US-GENERAL.md` | Bug fixes & improvements | US-G1 (DatePicker responsive), US-G2 (Category editing), US-G3 (Synonyms rework) | US-G1: ✅ Done, US-G2: ✅ Done, US-G3: ✅ Done |
| `US-STATISTICS.md` | Statistics & analytics | US-S1–S5 (Dashboard stats, period filtering, detailed page, word counters, success rate) | Planning |
| `US-QUIZ.md` | Quiz features | US-Q1–Q13 (Conjugation overhaul, AI answers, synonyms, presets, navigation) | Planning |

### Responsive Checklist for Every User Story

Before implementing ANY user story, verify these responsive requirements are addressed in the acceptance criteria:

- [ ] **No horizontal scroll** on 320px, 375px, 414px, 768px viewports
- [ ] **Touch targets** minimum 44×44px on mobile
- [ ] **Mobile-first** Tailwind classes (base → `sm:` → `md:` → `lg:`)
- [ ] **Portal components** use `position: fixed` with viewport clamping
- [ ] **Filter/action bars** use `overflow-x-auto` with `min-w-0` parent
- [ ] **Modals** use `w-full max-w-md mx-4` pattern
- [ ] **Forms** use `grid grid-cols-1 md:grid-cols-2`
- [ ] **Cards** use responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- [ ] **Tables** have horizontal scroll wrapper on mobile
- [ ] **Bottom nav** unaffected (no horizontal scroll interference)

### US-GENERAL Responsive Analysis

#### US-G1: Fix DatePicker Responsive Issues — ✅ COMPLETED

**What was done:**
- Removed duplicate raw HTML filter section from `AdvancedFilters.tsx` (was using un-imported `Calendar` icon)
- Fixed `CustomDatePicker.tsx`: changed from `position: absolute` (scroll-based) to `position: fixed` (viewport-relative)
- Added viewport clamping: width capped at `viewportWidth - 16`, left clamped so popup never goes off-screen, flips upward if insufficient space below
- Fixed `CustomDropdown.tsx` with same `position: fixed` + viewport clamping pattern
- Added `overflow-x-hidden` to dashboard layout (`layout.tsx`) and content page container
- Hidden ChevronDown caret when datepicker is open (`opacity-0`) to prevent visual bleed-through
- Removed dead `input[type="date"]` CSS from `globals.css` (no longer used)

**Files modified:**
- `src/components/ui/CustomDatePicker.tsx`
- `src/components/ui/CustomDropdown.tsx`
- `src/components/content/AdvancedFilters.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/content/page.tsx`
- `src/app/globals.css`

#### US-G2: Fix Category Editing When Linked to Content — ✅ COMPLETED

**What was done:**
- Added validation for empty name fields before save
- Added detailed `console.error` logging for Supabase errors (message + code)
- Replaced generic `t("common.error")` with specific `t("content.saveError")`
- Added error alert display inside the edit category modal
- Added `max-h-[90vh] overflow-y-auto` to modal for mobile keyboard handling
- Clears error state on new save attempt
- Added translation key `content.saveError` to both `fr.json` and `es.json`

**Files modified:**
- `src/app/dashboard/content/page.tsx`
- `src/translations/fr.json`
- `src/translations/es.json`

**Note:** If the error persists, the user should check Supabase RLS policies on the `categories` table (ensure UPDATE policy exists with `USING (true) WITH CHECK (true)`).

#### US-G3: Rework Synonyms — Language-Specific Aliases — ✅ COMPLETED

**What was done:**
- Added `language: "fr" | "es"` and `disabled` props to `AliasInput` component
- Each alias tag now shows a language badge (FR = blue, ES = amber)
- All forms now show BOTH FR and ES alias inputs side-by-side (removed `sourceLang` conditional)
- Updated labels to use `t("add.aliasesFr")` / `t("add.aliasesEs")` for clarity
- Grid layout `grid-cols-1 md:grid-cols-2` for alias inputs (stacks on mobile)
- Added `disabled` prop support for AliasInput
- Added translation keys `add.aliasesFr`, `add.aliasesEs` to both JSON files

**Files modified:**
- `src/components/forms/AliasInput.tsx`
- `src/components/add/VocabularyForm.tsx`
- `src/components/add/ExpressionForm.tsx`
- `src/components/add/VerbForm.tsx`
- `src/components/content/EditModal.tsx`
- `src/components/practice/VocabularyModal.tsx`
- `src/translations/fr.json`
- `src/translations/es.json`

### US-STATISTICS Responsive Analysis

#### US-S1: Statistics Dashboard — Real Data

**Responsive considerations:**
- Stats cards must use responsive grid: `grid-cols-1 sm:grid-cols-3`
- Loading skeletons must match card dimensions exactly (no layout shift)
- Numbers (`1234`, `73%`) must not overflow cards on small screens

#### US-S2: Period Filtering with Dropdowns

**Responsive considerations:**
- Period dropdowns MUST use `CustomDropdown` (portal-based, `position: fixed`)
- Custom date range MUST use `CustomDatePicker` (not native `<input type="date">`)
- Filter row: `flex flex-col sm:flex-row gap-3` — stack vertically on mobile
- Date inputs: stack vertically on mobile (`flex-col`), side-by-side on tablet+

#### US-S3: Detailed Statistics Page

**Responsive considerations:**
- Quiz history table: wrap in `overflow-x-auto` for horizontal scroll on mobile
- Bar charts: use percentage-width bars, not fixed pixels
- Stats cards grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- New nav item: verify bottom nav bar still fits 6 items without overflow

#### US-S4: Words Added Counter Per Portal

**Responsive considerations:**
- Tooltip on hover must use portal rendering (`position: fixed`)
- Touch devices: consider tap-to-show instead of hover

#### US-S5: Success Rate Calculation

**Responsive considerations:**
- Color indicator (red/yellow/green) must meet contrast requirements on mobile
- Percentage display: ensure `font-size` doesn't cause card overflow

### US-QUIZ Responsive Analysis

#### US-Q2: Conjugation — Tense Selection

**Responsive considerations:**
- Tense dropdown MUST use `CustomDropdown` component
- Full-width on mobile within `max-w-2xl` container

#### US-Q3: Verb Group Selection

**Responsive considerations:**
- Button group must use `flex-wrap gap-3` for mobile wrapping
- Each button: `flex-shrink-0` to prevent squishing

#### US-Q4: Pronoun Selection

**Responsive considerations:**
- Pronoun buttons: `flex-wrap gap-2` on mobile, or horizontal scroll with `overflow-x-auto hide-scrollbar`
- Each pronoun button: minimum 44×44px touch target

#### US-Q10: Saved Quiz Presets

**Responsive considerations:**
- Preset cards grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Save modal: `w-full max-w-md mx-4` pattern
- Launch button: prominent, accessible on mobile
- Empty state: centered text with icon, responsive padding

#### US-Q11: Backward Navigation During Quiz

**Responsive considerations:**
- Question progress dots: `overflow-x-auto hide-scrollbar` with `flex gap-1`
- Dots: minimum 28×28px touch target for tapping
- Navigation buttons: full-width on mobile, inline on desktop
- Keyboard arrows: document in help text for desktop users
