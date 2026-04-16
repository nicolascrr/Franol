# STATISTICS — User Stories

> **Category:** Statistics & Analytics
> **Stack:** Next.js 14 App Router · TypeScript · Supabase · Tailwind CSS
> **Status:** Planning — awaiting validation

---

## Table of Contents

1. [US-S1: Statistics Dashboard — Real Data Integration](#us-s1-statistics-dashboard--real-data-integration)
2. [US-S2: Period Filtering with Dropdowns](#us-s2-period-filtering-with-dropdowns)
3. [US-S3: Detailed Statistics Page](#us-s3-detailed-statistics-page)
4. [US-S4: Words Added Counter Per Portal](#us-s4-words-added-counter-per-portal)
5. [US-S5: Success Rate Calculation](#us-s5-success-rate-calculation)

---

## US-S1: Statistics Dashboard — Real Data Integration

**Priority:** High
**Complexity:** Medium
**Dependencies:** None
**Files to modify:**
- `src/components/dashboard/DashboardContent.tsx` (replace hardcoded zeros)
- `src/lib/stats.ts` (new file — statistics queries)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

The current dashboard shows hardcoded `0` values for "Words learned", "Success rate", and "Quizzes completed". These must be replaced with **real data** fetched from Supabase.

### Current State

```tsx
// src/components/dashboard/DashboardContent.tsx (lines with hardcoded values)
<p className="text-2xl font-bold text-franol-text">0</p>       // wordsLearned
<p className="text-2xl font-bold text-franol-text">0%</p>      // successRate  
<p className="text-2xl font-bold text-franol-text">0</p>       // quizCompleted
```

### Architecture

Create a new utility file `src/lib/stats.ts` that provides all statistics functions. These functions query the Supabase database directly.

```typescript
// src/lib/stats.ts
export interface DashboardStats {
  totalWordsAdded: number;       // total vocabulary + expressions + conjugations count
  totalQuizzesCompleted: number; // count from quiz_history
  overallSuccessRate: number;    // percentage from quiz_history
  wordsByType: {
    vocabulary: number;
    expressions: number;
    conjugations: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  // Parallel queries for performance
  const [vocabRes, exprRes, conjRes, historyRes] = await Promise.all([
    supabase.from("vocabulary").select("id", { count: "exact", head: true }),
    supabase.from("expressions").select("id", { count: "exact", head: true }),
    supabase.from("conjugations").select("id", { count: "exact", head: true }),
    supabase.from("quiz_history").select("score_percentage"),
  ]);

  const totalWordsAdded = (vocabRes.count || 0) + (exprRes.count || 0) + (conjRes.count || 0);
  const totalQuizzesCompleted = historyRes.data?.length || 0;
  const scores = historyRes.data?.map(h => h.score_percentage) || [];
  const overallSuccessRate = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return {
    totalWordsAdded,
    totalQuizzesCompleted,
    overallSuccessRate,
    wordsByType: {
      vocabulary: vocabRes.count || 0,
      expressions: exprRes.count || 0,
      conjugations: conjRes.count || 0,
    },
  };
}
```

### UI Changes

Since `DashboardContent` is a client component, it must fetch data via `useEffect`:

```tsx
const [stats, setStats] = useState<DashboardStats | null>(null);
const [isLoadingStats, setIsLoadingStats] = useState(true);

useEffect(() => {
  getDashboardStats()
    .then(setStats)
    .catch(console.error)
    .finally(() => setIsLoadingStats(false));
}, []);
```

Display:
- Loading state: skeleton pulse animation on the stat values
- Loaded state: real numbers displayed
- Error state: show "—" with a muted style

### Acceptance Criteria

- [ ] `src/lib/stats.ts` created with `getDashboardStats()` function
- [ ] `DashboardContent.tsx` fetches real data on mount
- [ ] "Words learned" shows total count of vocabulary + expressions + conjugations
- [ ] "Quizzes completed" shows count from `quiz_history`
- [ ] "Success rate" shows average `score_percentage` from `quiz_history`, formatted as `XX%`
- [ ] Loading skeleton while data is fetching
- [ ] Graceful error handling (show `—` on error)
- [ ] No hardcoded `0` values remain
- [ ] All existing Supabase best practices followed (error handling, client import)

---

## US-S2: Period Filtering with Dropdowns

**Priority:** High
**Complexity:** Medium
**Dependencies:** US-S1
**Files to modify:**
- `src/components/dashboard/DashboardContent.tsx` (add filter dropdowns)
- `src/lib/stats.ts` (add period parameter)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

Add period filtering dropdowns to the statistics section so users can view stats for specific time ranges. The filtering must apply to all displayed statistics.

### Period Options

| Period Key | Label FR | Label ES | Logic |
|---|---|---|---|
| `all` | Tout | Todo | All time (no filter) |
| `today` | Aujourd'hui | Hoy | `created_at >= today 00:00` |
| `week` | Cette semaine | Esta semana | `created_at >= start of week` |
| `month` | Ce mois | Este mes | `created_at >= start of month` |
| `quarter` | Ce trimestre | Este trimestre | `created_at >= 3 months ago` |
| `year` | Cette année | Este año | `created_at >= start of year` |
| `custom` | Personnalisé | Personalizado | Date range picker |

### UI Specification

- **Location:** A row of dropdown selectors above the stats cards
- **Component:** Two `<select>` dropdowns:
  1. **Period selector** (default: "All time") — dropdown with predefined options
  2. **Custom range** (visible only when `custom` is selected) — two date inputs (from/to)
- **Styling:** Same pattern as existing filter dropdowns (rounded-xl, border-franol-warm)

### Data Flow

```
User selects period → state: selectedPeriod ("all" | "today" | "week" | "month" | "quarter" | "year" | "custom")
                    → state: customDateFrom, customDateTo (if custom)
                    → getDashboardStats({ period, dateFrom, dateTo })
                    → Stats update reactively
```

### Backend Changes

```typescript
// src/lib/stats.ts — updated function signature
export interface StatsFilter {
  period: "all" | "today" | "week" | "month" | "quarter" | "year" | "custom";
  dateFrom?: string; // ISO date string for custom range
  dateTo?: string;   // ISO date string for custom range
}

export async function getDashboardStats(filter?: StatsFilter): Promise<DashboardStats> {
  // Build date filter based on period
  const dateFilter = buildDateFilter(filter);
  
  // Apply filter to all queries:
  // vocabulary, expressions, conjugations: WHERE created_at >= dateFilter
  // quiz_history: WHERE created_at >= dateFilter
}
```

### Acceptance Criteria

- [ ] Period dropdown with all 7 options (6 predefined + custom)
- [ ] Default: "All time" (no filter)
- [ ] Selecting a period immediately recalculates and displays stats
- [ ] Custom range shows two date inputs (from/to) when "Custom" is selected
- [ ] Date inputs use the native date picker (consistent with existing advanced filters)
- [ ] All stats (words added, quizzes completed, success rate) respect the selected period
- [ ] Dropdown labels are localized (FR and ES portals)
- [ ] Translation keys: `stats.period.all`, `stats.period.today`, `stats.period.week`, `stats.period.month`, `stats.period.quarter`, `stats.period.year`, `stats.period.custom`, `stats.period.from`, `stats.period.to`
- [ ] Responsive: dropdowns stack vertically on mobile, side-by-side on desktop
- [ ] Loading state during recalculation

---

## US-S3: Detailed Statistics Page

**Priority:** Medium
**Complexity:** Medium
**Dependencies:** US-S1, US-S2
**Files to create:**
- `src/app/dashboard/stats/page.tsx` (new page)
- `src/components/stats/StatsContent.tsx` (client component)
**Files to modify:**
- `src/components/ui/Navigation.tsx` (add stats link)
- `src/lib/stats.ts` (add detailed stats functions)
- `src/translations/fr.json`
- `src/translations/es.json`

### Description

Create a dedicated statistics page accessible from the navigation. This page provides more detailed analytics than the dashboard summary.

### Page Content

**Section 1: Overview Cards** (same data as dashboard, with period filter)

**Section 2: Quiz History**
- List of recent quizzes with: date, mode, score, duration, question count
- Clickable to view full quiz results (if stored)

**Section 3: Content Breakdown**
- Bar chart or simple visual showing:
  - Vocabulary count by category
  - Expression count by context
  - Conjugation count by group
- Use simple Tailwind bar charts (no chart library needed)

**Section 4: Performance by Mode**
- Average score per mode (classic, vocabulary, expressions, conjugation)
- Simple percentage bars

### Acceptance Criteria

- [ ] New page at `/dashboard/stats`
- [ ] Server component wrapper + client `StatsContent.tsx` component
- [ ] Navigation updated with a "Statistics" link (icon: `BarChart3` from lucide-react)
- [ ] Period filter (same as US-S2) applies to all sections
- [ ] Quiz history table with: date, mode, score (%), duration, count
- [ ] Content breakdown by type and category (visual bars)
- [ ] Performance by quiz mode (average scores)
- [ ] Responsive: stacks vertically on mobile
- [ ] Translation keys added to both JSON files
- [ ] `export const dynamic = 'force-dynamic'` on the page (fresh data)

---

## US-S4: Words Added Counter Per Portal

**Priority:** Medium
**Complexity:** Low
**Dependencies:** US-S1
**Files to modify:**
- `src/lib/stats.ts` (add portal-specific counts)

### Description

The "Words added" counter must reflect the count of items visible in the current portal. Since there are no user accounts yet, all data is shared. The counter should show:

- Total vocabulary entries
- Total expression entries  
- Total conjugation entries
- Grand total

With a breakdown by type visible on hover or in the detailed stats page.

### Acceptance Criteria

- [ ] `getDashboardStats()` returns `wordsByType` breakdown
- [ ] Dashboard shows the sum of all types as the main number
- [ ] Hovering on the "Words learned" card shows a tooltip with the breakdown
- [ ] Translation keys: `stats.wordsBreakdown`

---

## US-S5: Success Rate Calculation

**Priority:** Medium
**Complexity:** Low
**Dependencies:** US-S1
**Files to modify:**
- `src/lib/stats.ts`

### Description

The success rate is calculated as the average of all `score_percentage` values in `quiz_history`, filtered by the selected period.

### Calculation

```typescript
successRate = sum(all score_percentage) / count(quiz_history entries) * 1
// Already a percentage, so just average the values
```

### Acceptance Criteria

- [ ] Success rate is the average of `score_percentage` from `quiz_history`
- [ ] Rounded to nearest integer (e.g., 73% not 73.4%)
- [ ] Returns `0%` if no quiz history exists
- [ ] Respects period filter from US-S2
- [ ] Displayed with a color indicator:
  - Red: < 50%
  - Yellow: 50-70%
  - Green: > 70%

---

## Implementation Order

```
Phase 1 — Real Data
├── US-S1: Dashboard real data integration
└── US-S5: Success rate calculation

Phase 2 — Filtering
└── US-S2: Period filtering with dropdowns

Phase 3 — Detailed View
├── US-S3: Detailed statistics page
└── US-S4: Words added counter per portal
```

---

## Summary

| US | Title | Priority | Complexity | Dependencies |
|---|---|---|---|---|
| US-S1 | Statistics Dashboard — Real Data | High | Medium | None |
| US-S2 | Period Filtering with Dropdowns | High | Medium | US-S1 |
| US-S3 | Detailed Statistics Page | Medium | Medium | US-S1, S2 |
| US-S4 | Words Added Counter Per Portal | Medium | Low | US-S1 |
| US-S5 | Success Rate Calculation | Medium | Low | US-S1 |

**Total:** 5 user stories
