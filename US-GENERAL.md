# GENERAL — User Stories

> **Category:** Bug Fixes & General Improvements
> **Stack:** Next.js 14 App Router · TypeScript · Supabase · Tailwind CSS
> **Status:** Planning — awaiting validation

---

## Table of Contents

1. [US-G1: Fix DatePicker Responsive Issues](#us-g1-fix-datepicker-responsive-issues)
2. [US-G2: Fix Category Editing When Linked to Content](#us-g2-fix-category-editing-when-linked-to-content)
3. [US-G3: Rework Synonyms — Language-Specific Aliases](#us-g3-rework-synonyms--language-specific-aliases)

---

## US-G1: Fix DatePicker Responsive Issues

**Priority:** High
**Complexity:** Medium
**Dependencies:** None
**Files to modify:**
- `src/components/content/AdvancedFilters.tsx`
- `src/app/globals.css`

### Bug Description

The native HTML `<input type="date">` date pickers in the **Advanced Filters** panel (`/dashboard/content`) have three issues:

1. **Not contained within screen bounds on mobile** — the date picker popup overflows the viewport
2. **Placeholder text is not cropped** — long placeholder text extends beyond the input boundary
3. **Caret is problematic** — the text cursor (caret) appears in date inputs, which is confusing since these are not free-text fields

### Root Cause Analysis

**Issue 1: Overflow on mobile**
- The `AdvancedFilters` component uses `flex` layout with date inputs
- On small screens (< 375px), the date inputs may push beyond their container
- The date picker dropdown from the browser is positioned relative to the input, potentially overflowing

**Issue 2: Placeholder not cropped**
- `input[type="date"]` has browser-specific rendering
- The placeholder (e.g., "Du" / "Au") may not respect `overflow: hidden` on some browsers
- On mobile, the native date picker may display differently

**Issue 3: Caret issue**
- `input[type="date"]` shows a text caret on some browsers (Chrome desktop)
- This gives the impression that the user can type a date freely
- The caret should be hidden, and only the date picker icon should be visible

### Solution

```css
/* src/app/globals.css — Add to @layer utilities */

/* Fix date input responsive issues */
input[type="date"] {
  /* Prevent text caret */
  caret-color: transparent;
  cursor: pointer;

  /* Ensure placeholder is cropped */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Consistent sizing */
  min-width: 0;
  flex-shrink: 1;

  /* Remove default browser padding that can cause overflow */
  box-sizing: border-box;
}

/* Ensure date picker dropdown stays within viewport */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  /* Prevent the indicator from causing overflow */
  flex-shrink: 0;
}

/* Mobile-specific fixes */
@media (max-width: 640px) {
  input[type="date"] {
    width: 100%;
    max-width: 100%;
  }
}
```

**Component changes in `AdvancedFilters.tsx`:**
- Ensure date inputs are in a `flex flex-col sm:flex-row` container
- Each date input gets `w-full sm:w-auto` and `min-w-0`
- Add `placeholder` attribute with short text (already has `t("content.from")` / `t("content.to")`)
- Wrap the date inputs container with `overflow-hidden` on mobile

### Acceptance Criteria

- [ ] Date picker dropdown does NOT overflow the viewport on mobile (320px, 375px, 414px tested)
- [ ] Placeholder text is properly contained within the input bounds
- [ ] Text caret is hidden (`caret-color: transparent`) — only the calendar icon is visible
- [ ] Cursor is `pointer` on hover (indicates clickability)
- [ ] Date inputs stack vertically on mobile, side-by-side on tablet+
- [ ] No horizontal scroll introduced by date inputs
- [ ] Works on: Chrome, Firefox, Safari, mobile Chrome, mobile Safari
- [ ] Global CSS changes are in `@layer utilities` (not `@layer base` to avoid specificity issues)
- [ ] The fix does NOT affect other input types (text, number, select)

---

## US-G2: Fix Category Editing When Linked to Content

**Priority:** High
**Complexity:** Medium
**Dependencies:** None
**Files to modify:**
- `src/app/dashboard/content/page.tsx` (category edit modal + save logic)

### Bug Description

When a category is **linked to content** (e.g., a vocabulary entry uses it as its category), attempting to **edit** the category (change its name, color) fails with an error message. This should NOT happen — editing a category should always succeed, and **all linked content should automatically reflect the change**.

### Root Cause Analysis

The current `handleSaveCategory()` in `content/page.tsx` performs:

```typescript
const { data, error: err } = await supabase
  .from("categories")
  .update({
    name_fr: categoryEditForm.name_fr,
    name_es: categoryEditForm.name_es,
    color: categoryEditForm.color,
    updated_at: now,
  })
  .eq("id", editingCategory.id)
  .select()
  .single();
```

The likely cause of the error:
1. **RLS (Row Level Security) policy** may prevent UPDATE on categories that are referenced by other tables (foreign key constraints)
2. **Foreign key constraint** — if the `categories` table has a foreign key relationship that prevents updates when referenced
3. **Error handling** — the catch block just shows `t("common.error")` without details, hiding the real error

### Investigation Steps

1. Check Supabase RLS policies on `categories` table
2. Check foreign key constraints between `vocabulary.category` / `expressions.context` and `categories.id`
3. Check if the error is from Supabase or from the client-side code

### Fix Strategy

The fix depends on the root cause:

**If RLS policy issue:**
```sql
-- Ensure the UPDATE policy exists
CREATE POLICY "Allow update on categories" ON categories
  FOR UPDATE USING (true) WITH CHECK (true);
```

**If foreign key constraint:**
- The `categories.id` should not change (only `name_fr`, `name_es`, `color` change)
- Foreign key constraints should NOT block updates of non-key columns
- If there's an ON UPDATE CASCADE missing, add it

**If client-side error:**
- Improve error logging to see the actual Supabase error
- Ensure the update only sends changed fields

### Updated `handleSaveCategory()`

```typescript
const handleSaveCategory = async () => {
  if (!editingCategory) return;
  setIsSavingCategory(true);
  setError(""); // Clear previous errors

  try {
    const now = new Date().toISOString();
    const { data, error: err } = await supabase
      .from("categories")
      .update({
        name_fr: categoryEditForm.name_fr,
        name_es: categoryEditForm.name_es,
        color: categoryEditForm.color,
        updated_at: now,
      })
      .eq("id", editingCategory.id)
      .select()
      .single();

    if (err) {
      console.error("Supabase error updating category:", err);
      throw err;
    }

    // Update local state
    setCategories((prev) =>
      prev.map((c) => (c.id === editingCategory.id ? data : c)),
    );

    // No need to update content items — they reference the category by ID
    // The name is looked up dynamically via getItemCategory()

    closeEditCategoryModal();
  } catch (error) {
    console.error("Error saving category:", error);
    setError(t("content.saveError")); // New, more specific error key
  } finally {
    setIsSavingCategory(false);
  }
};
```

### Acceptance Criteria

- [ ] Category editing succeeds even when linked to vocabulary, expressions, or conjugations
- [ ] After editing a category, the updated name/color appears in all content cards that reference it
- [ ] Error message is specific (not generic "Une erreur est survenue")
- [ ] Detailed error logged to console for debugging
- [ ] The fix does NOT require updating every linked content item (categories are referenced by ID, names are resolved dynamically via `getItemCategory()`)
- [ ] SQL investigation: user should check and fix RLS/constraints in Supabase if needed
- [ ] Translation key: `content.saveError` added to both JSON files

---

## US-G3: Rework Synonyms — Language-Specific Aliases

**Priority:** High
**Complexity:** High
**Dependencies:** Database schema change (SQL provided for manual execution)
**Files to modify:**
- `src/components/forms/AliasInput.tsx` (add language selector)
- `src/app/dashboard/add/page.tsx` (update forms to separate FR/ES aliases)
- `src/app/dashboard/content/page.tsx` (update edit modal)
- `src/lib/duplicates.ts` (update duplicate detection)
- `src/lib/quiz.ts` (update alias usage in quiz generation)
- `src/types/index.ts` (update types if schema changes)
- `src/translations/fr.json`
- `src/translations/es.json`

### Current Problem

Currently, aliases (synonyms) are stored in two flat arrays:
- `aliases_fr: string[]` — aliases for the French word
- `aliases_es: string[]` — aliases for the Spanish word

However, there is **no way to specify which language a synonym belongs to** when the synonym itself could be ambiguous. For example:
- "bonjour" could have the alias "salut" (French) and "hola" (Spanish)
- Currently, "salut" goes in `aliases_fr` and "hola" goes in `aliases_es`
- But what if a user wants to add a synonym that's in a different language?

### Proposed Change

**Rename the concept from "synonym" to "alias" and keep the current FR/ES separation, but add a clear language label to each alias input.**

The current schema already separates by language (`aliases_fr` and `aliases_es`), which is correct. The improvement is to:

1. **Clearly label** each alias input with its language
2. **Allow adding aliases in both languages** on the same form
3. **Show language badges** next to each alias tag

### Database Schema Change

> **NOTE:** The SQL script is provided below for manual execution. The database schema does NOT need to change — the current `aliases_fr[]` and `aliases_es[]` columns are already language-specific. The change is primarily UI/UX.

However, if we want to add **cross-language synonyms** (e.g., a French synonym for a Spanish word), we could add:

```sql
-- Option A: Keep current schema (aliases_fr and aliases_es are already language-specific)
-- No SQL change needed. Just improve the UI.

-- Option B: Add a unified aliases table (for future flexibility)
-- This is NOT recommended now — too much migration work for minimal benefit.
```

**Recommendation: Option A** — The current schema already has language-specific alias arrays. The improvement is purely UI.

### UI Changes

**Current AliasInput:**
```
[AliasInput for FR aliases]  →  tags: salut, coucou
[AliasInput for ES aliases]  →  tags: hola, buenas
```

**Updated AliasInput with language badges:**
```
[🇫🇷 Synonymes en français]  →  tags: salut (FR), coucou (FR)
[🇪🇸 Sinónimos en español]   →  tags: hola (ES), buenas (ES)
```

Each alias tag should show:
- The alias text
- A small language badge (FR/ES) — color-coded
- A remove button (×)

### Implementation

Update `AliasInput.tsx` to accept a `language` prop:

```typescript
interface AliasInputProps {
  aliases: string[];
  onAdd: (alias: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  language: "fr" | "es"; // NEW: language badge
  disabled?: boolean;
}

export function AliasInput({ aliases, onAdd, onRemove, placeholder, language, disabled }: AliasInputProps) {
  // Each tag gets a small language badge
  // FR badge: blue background
  // ES badge: orange/amber background
}
```

### Acceptance Criteria

- [ ] `AliasInput` component accepts a `language: "fr" | "es"` prop
- [ ] Each alias tag displays a small language badge (FR = blue, ES = amber)
- [ ] Labels above alias inputs are clearly language-specific:
  - FR portal: "Synonymes en français" / "Sinónimos en español"
  - ES portal: "Sinónimos en francés" / "Sinónimos en español"
- [ ] `add/page.tsx` forms updated: each AliasInput has the correct `language` prop
- [ ] `content/page.tsx` edit modal updated similarly
- [ ] Duplicate detection still works correctly (checks both arrays)
- [ ] Quiz generation uses the correct alias array for the target language
- [ ] Translation keys: `add.aliasesFr`, `add.aliasesEs` (more specific than current `add.aliases`)
- [ ] Responsive: tags wrap on mobile with `flex-wrap`
- [ ] No SQL migration needed — the data structure is unchanged

### SQL Script (Informational Only — No Schema Change Required)

```sql
-- =====================================================
-- Synonym Language Rework — SQL Script
-- =====================================================
-- IMPORTANT: No schema change is required.
-- The current aliases_fr[] and aliases_es[] columns already
-- separate aliases by language.
--
-- This improvement is purely a UI/UX change.
-- =====================================================
-- 
-- VERIFICATION (run this to confirm current schema):
-- 
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name IN ('vocabulary', 'expressions', 'conjugations')
--   AND column_name LIKE 'aliases%';
--
-- Expected result:
-- | table_name    | column_name | udt_name |
-- |---------------|-------------|----------|
-- | vocabulary    | aliases_fr  | _text    |
-- | vocabulary    | aliases_es  | _text    |
-- | expressions   | aliases_fr  | _text    |
-- | expressions   | aliases_es  | _text    |
-- | conjugations  | aliases_fr  | _text    |
-- | conjugations  | aliases_es  | _text    |
--
-- ✅ If you see the above, no migration is needed.
-- =====================================================
```

---

## Implementation Order

```
Phase 1 — Bug Fixes
├── US-G1: Fix DatePicker responsive issues
└── US-G2: Fix category editing when linked to content

Phase 2 — Synonym Improvement
└── US-G3: Rework synonyms with language badges
```

---

## Summary

| US | Title | Priority | Complexity | Dependencies |
|---|---|---|---|---|
| US-G1 | Fix DatePicker Responsive | High | Medium | None |
| US-G2 | Fix Category Editing | High | Medium | None |
| US-G3 | Rework Synonyms — Language Badges | High | High | None (no DB change) |

**Total:** 3 user stories
