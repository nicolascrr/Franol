# Frañol — Agent Development Guide

> **Project:** Bilingual language learning app (French ↔ Spanish)  
> **Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase, Tailwind CSS  
> **Architecture:** Server Components + Client Components, SSR-optimized

---

## 🛠️ Build & Dev Commands

```bash
# Package manager (ALWAYS use pnpm, never npm/yarn)
pnpm install              # Install dependencies

# Development
pnpm dev                  # Start dev server (http://localhost:3000)

# Building
pnpm build                # Production build
pnpm start                # Run production server

# Linting & Type Checking
pnpm lint                 # ESLint
npx tsc --noEmit          # TypeScript check (no test framework configured)

# Clean build (if issues arise)
rm -rf .next node_modules pnpm-lock.yaml && pnpm install && pnpm build
```

**Note:** No test framework configured yet. Manual testing required.

---

## 📁 Project Structure

```
src/
├── app/                       # Next.js 14 App Router
│   ├── (pages)               # Page routes
│   ├── api/                  # API route handlers
│   ├── layout.tsx            # Root layout (Server Component)
│   └── globals.css           # Global styles + Tailwind
├── components/
│   ├── ui/                   # Shared UI components (Navigation, modals, etc.)
│   ├── home/                 # Homepage-specific components
│   ├── content/              # Content management components
│   └── forms/                # Reusable form components (AliasInput, etc.)
├── contexts/
│   └── LocaleContext.tsx     # i18n context (locale + translations)
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser Supabase client (Client Components)
│   │   └── server.ts         # Server Supabase client (Server Components)
│   ├── quiz.ts               # Quiz generation & management
│   ├── openai.ts             # AI integration
│   └── utils.ts              # Utility functions (cn, etc.)
├── translations/
│   ├── fr.json               # French translations
│   └── es.json               # Spanish translations
├── types/
│   └── content.ts            # Shared TypeScript types
└── data/                     # Static data (fun facts, etc.)
```

---

## 🎨 Code Style Guidelines

### **1. Imports**

**Order:** External → Internal → Types → CSS

```typescript
// ✅ GOOD
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import type { QuizConfig } from "@/lib/quiz";
```

**Use path alias `@/` for all internal imports:**
```typescript
// ✅ GOOD
import { createClient } from "@/lib/supabase/client";

// ❌ BAD
import { createClient } from "../../lib/supabase/client";
```

---

### **2. Component Structure**

**Client Components:**
```typescript
"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

interface MyComponentProps {
  initialData: string[];
}

export function MyComponent({ initialData }: MyComponentProps) {
  const { t } = useLocale();
  const [data, setData] = useState(initialData);

  return <div>{/* JSX */}</div>;
}
```

**Server Components:**
```typescript
// No "use client" directive
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("table").select("*");
  
  return <ClientComponent initialData={data} />;
}
```

---

### **3. Naming Conventions**

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `Navigation`, `ContentCard` |
| Functions | camelCase | `handleSubmit`, `fetchData` |
| Files (components) | PascalCase | `Navigation.tsx`, `AliasInput.tsx` |
| Files (utilities) | kebab-case | `quiz.ts`, `openai.ts` |
| Constants | UPPER_SNAKE_CASE | `LOCALE_STORAGE_KEY` |
| Types/Interfaces | PascalCase | `QuizConfig`, `ContentItem` |
| CSS classes | Tailwind utility classes | `bg-franol-cream`, `text-franol-text` |

---

### **4. TypeScript**

**Use explicit types for props and function returns:**
```typescript
// ✅ GOOD
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ onClick, disabled, children }: ButtonProps): JSX.Element {
  return <button onClick={onClick} disabled={disabled}>{children}</button>;
}

// ❌ BAD (implicit any)
export function Button({ onClick, disabled, children }) {
  return <button onClick={onClick} disabled={disabled}>{children}</button>;
}
```

**Use `type` for unions, `interface` for objects:**
```typescript
// Types
type Locale = "fr" | "es" | null;
type QuizMode = "classic" | "vocabulary" | "expressions";

// Interfaces
interface Category {
  id: string;
  name_fr: string;
  name_es: string;
}
```

---

### **5. Styling**

**Use Tailwind CSS exclusively — no inline styles or CSS modules.**

```typescript
// ✅ GOOD
<div className="px-4 py-3 bg-franol-cream rounded-xl border border-franol-warm">

// ✅ GOOD (conditional classes with cn utility)
<div className={cn(
  "px-4 py-3 rounded-xl",
  isActive ? "bg-franol-accent-blue text-white" : "bg-white text-franol-text"
)}>

// ❌ BAD
<div style={{ padding: "12px", backgroundColor: "#FDFBF7" }}>
```

**Custom colors (from `tailwind.config.ts`):**
- `franol-cream` (#FDFBF7) — Background
- `franol-sand` (#F5F0E8) — Light accent
- `franol-warm` (#E8DFD0) — Borders
- `franol-text` (#2D2A26) — Primary text
- `franol-muted` (#6B6560) — Secondary text
- `franol-accent-blue` (#1E3A8A) — Primary actions

---

### **6. Supabase Usage**

**Browser context (Client Components):**
```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data } = await supabase.from("vocabulary").select("*");
```

**Server context (Server Components, API routes):**
```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data } = await supabase.from("vocabulary").select("*");
```

**⚠️ NEVER import `@/lib/supabase` directly — it's deleted. Always use `client.ts` or `server.ts`.**

---

### **7. Error Handling**

```typescript
// API Routes
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

// Client Components
try {
  await fetchData();
} catch (error) {
  console.error("Error fetching data:", error);
  setError("Something went wrong. Please try again.");
}
```

---

### **8. Translations (i18n)**

**Use the `t()` function from `useLocale()` hook:**
```typescript
const { t, locale } = useLocale();

return (
  <h1>{t("dashboard.welcome")}</h1>
  <p>{t("practice.setup.title")}</p>
);
```

**Translation keys use dot notation matching JSON structure:**
```json
{
  "dashboard": {
    "welcome": "Bienvenue"
  }
}
```

---

## 🏗️ Architecture Patterns

### **Server vs Client Components**

**Use Server Components when:**
- Fetching data from Supabase
- No browser APIs needed (localStorage, window, etc.)
- No React hooks needed (useState, useEffect, useRouter, etc.)

**Use Client Components when:**
- Using React hooks
- Handling user interactions (onClick, onChange, etc.)
- Accessing browser APIs
- Using context (`useLocale()`)

**Pattern:** Server Component fetches data → passes to Client Component as props

```typescript
// page.tsx (Server Component)
export default async function ContentPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("vocabulary").select("*");
  return <ContentClient initialData={data} />;
}

// ContentClient.tsx (Client Component)
"use client";
export function ContentClient({ initialData }) {
  const [data, setData] = useState(initialData);
  // Interactive logic here
}
```

---

## 🚨 Common Pitfalls

1. **Don't use `npm` or `yarn`** — Always use `pnpm` (enforced by `packageManager` field)
2. **Don't import old Supabase client** — Use `/client` or `/server` versions
3. **Don't add `"use client"` unless necessary** — Server Components are default and faster
4. **Don't access `localStorage` in Server Components** — Will cause hydration errors
5. **Don't forget to restart dev server** after changing `.env` variables
6. **Don't use `console.log` in production code** — Remove before committing

---

## 📝 Commit Guidelines

```bash
# Format: type: brief description
git commit -m "feat: add vocabulary export feature"
git commit -m "fix: correct quiz scoring calculation"
git commit -m "refactor: extract AliasInput to shared component"
git commit -m "docs: update AGENTS.md with API patterns"
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## 📦 Shared Types & Constants

### **Types Location**
All shared TypeScript types are centralized in `src/types/index.ts`:

```typescript
// ✅ GOOD - Import from shared types
import type { Category, VocabularyItem, ExpressionItem, ConjugationItem, ContentItem } from "@/types";

// ❌ BAD - Defining types inline in components
interface Category {
  id: string;
  name_fr: string;
  // ...
}
```

**Available types:**
- `Category` - Category/context for vocabulary and expressions
- `VocabularyItem` - Vocabulary word pair
- `ExpressionItem` - Expression/idiom pair
- `ConjugationItem` - Verb conjugation entry
- `ContentItem` - Union type for any content
- `HistoryItem` - Alias for ContentItem with type discriminator
- `VocabFormState`, `ExpressionFormState`, `VerbFormState` - Form state types
- `defaultVocabForm`, `defaultExpressionForm`, `defaultVerbForm` - Default form values

### **Constants Location**
Shared constants are in `src/lib/constants.ts`:

```typescript
// ✅ GOOD - Import from shared constants
import { ARTICLES_FR, ARTICLES_ES } from "@/lib/constants";

// ❌ BAD - Defining constants inline
const ARTICLES_FR = ["Le", "La", "L'", ...];
```

### **Duplicate Detection**
Use the shared `checkDuplicate` function from `src/lib/duplicates.ts`:

```typescript
// ✅ GOOD
import { checkDuplicate, type DuplicateMatch } from "@/lib/duplicates";

const duplicates = await checkDuplicate("vocabulary", wordFr, wordEs, aliasesFr, aliasesEs);

// ❌ BAD - Implementing duplicate detection inline
const checkDuplicate = async (...) => { /* 100+ lines of code */ };
```

---

## 🧩 Component Extraction Guidelines

### **When to Extract Components**

Extract a component when:
1. **File exceeds 300 lines** - Consider breaking into smaller components
2. **Code is duplicated** across 2+ files - Extract to shared component
3. **Logical separation** - Forms, modals, lists should be separate components
4. **Reusability** - Component could be used in multiple places

### **Component Organization**

```
src/components/
├── ui/           # Generic UI components (Navigation, ConfirmModal, FunFacts)
├── forms/        # Reusable form inputs (AliasInput)
├── add/          # Add page specific components (VocabularyForm, ExpressionForm, VerbForm)
├── content/      # Content page components (ContentCard, CategoryCard, AdvancedFilters)
├── practice/     # Practice page components (PracticeContent, DiscoveryContent)
├── dashboard/    # Dashboard components (DashboardContent, Changelog)
└── home/         # Homepage components (LanguageButton, FlagTicker)
```

### **Form Component Pattern**

```typescript
// src/components/add/VocabularyForm.tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { AliasInput } from "@/components/forms/AliasInput";
import { ARTICLES_FR, ARTICLES_ES } from "@/lib/constants";
import type { Category } from "@/types";
import type { LangCode } from "@/lib/lang";

interface VocabularyFormProps {
  form: VocabFormState;
  categories: Category[];
  sourceLang: LangCode;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: string, value: string | string[]) => void;
  onOpenCategoryModal: () => void;
}

export function VocabularyForm({ form, categories, ... }: VocabularyFormProps) {
  // Component implementation
}
```

### **Modal Component Pattern**

```typescript
// Modal components should be controlled by parent state
interface CategoryModalProps {
  show: boolean;
  categoryType: "vocabulary" | "expression" | "conjugation";
  form: { name_fr: string; name_es: string; color: string };
  isSaving: boolean;
  onClose: () => void;
  onFieldChange: (field: string, value: string) => void;
  onCreate: () => void;
}

export function CategoryModal({ show, onClose, ... }: CategoryModalProps) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      {/* Modal content */}
    </div>
  );
}
```

---

## 📏 File Size Guidelines

### **Recommended Limits**

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Page components | 400 | Extract forms, modals, sections |
| UI components | 200 | Split into smaller components |
| Utility files | 300 | Split into focused modules |
| API routes | 150 | Extract validation/helpers |

### **Large Files Requiring Refactoring**

- `src/app/dashboard/add/page.tsx` (2054 lines) → Extract: VocabularyForm, ExpressionForm, VerbForm, CategoryModal, DuplicateWarning, HistorySection
- `src/app/dashboard/content/page.tsx` (1833 lines) → Extract: EditModal, DeleteModal, CategoryEditModal
- `src/app/dashboard/practice/results/page.tsx` (1184 lines) → Extract: VocabularyModal
- `src/app/dashboard/practice/quiz/page.tsx` (890 lines) → Extract: QuizQuestion, QuizFeedback, QuitModal

---

## 🔄 Reusable Components

### **AliasInput**
Already exists at `src/components/forms/AliasInput.tsx`. Always use this instead of creating inline versions:

```typescript
// ✅ GOOD
import { AliasInput } from "@/components/forms/AliasInput";

<AliasInput
  aliases={form.aliases_fr}
  onAdd={(alias) => onFieldChange("aliases_fr", [...form.aliases_fr, alias])}
  onRemove={(index) => onFieldChange("aliases_fr", form.aliases_fr.filter((_, i) => i !== index))}
  placeholder={t("add.aliasPlaceholder")}
/>

// ❌ BAD - Creating inline AliasInput
function AliasInput({ aliases, onAdd, onRemove, placeholder }) {
  // 50+ lines of duplicated code
}
```

---

## 🎯 Best Practices Summary

1. **Import shared types** from `@/types` - Never define inline
2. **Import shared constants** from `@/lib/constants` - Never duplicate
3. **Use shared AliasInput** from `@/components/forms/AliasInput`
4. **Use shared checkDuplicate** from `@/lib/duplicates`
5. **Keep files under 400 lines** - Extract components when needed
6. **Extract forms** into separate components with clear prop interfaces
7. **Extract modals** into controlled components with show/onClose props
8. **Use LangCode type** from `@/lib/lang` for language parameters

---

**Last Updated:** 2025 (Phase 3 — Component extraction & shared types)
