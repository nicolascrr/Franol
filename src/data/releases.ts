/**
 * Release notes history for Frañol
 * Only user-facing features, written in English
 */

import packageJson from "../../package.json";

export interface ReleaseFeature {
  title: string;
  desc: string;
  type: "feature" | "improvement" | "fix";
}

export interface Release {
  version: string;
  date: string;
  features: ReleaseFeature[];
}

export const releases: Release[] = [
  {
    version: "1.2.0",
    date: "2026-04-19",
    features: [
      {
        title: "Smart articles in AI quizzes",
        desc: "AI-generated questions now use the correct article for each noun: indefinite (un/une) for countable words to reveal gender, and definite (le/la) for uncountables like milk or flour",
        type: "feature",
      },
      {
        title: "Cleaner AI explanations",
        desc: "Explanations no longer contain Markdown formatting like **bold** or *italic* — just clean, readable text",
        type: "fix",
      },
      {
        title: "Collapsible synonyms sections",
        desc: "Language-specific synonyms inputs now group into a collapsible section, making forms cleaner and less overwhelming",
        type: "improvement",
      },
      {
        title: "Custom checkboxes",
        desc: "Replaced native checkboxes with styled ones that match Frañol's design across all forms and modals",
        type: "feature",
      },
      {
        title: "Simplified edit modal",
        desc: "The content edit modal was refactored for better readability and consistency across vocabulary, expressions and verbs",
        type: "improvement",
      },
      {
        title: "Fixed guillemets wrapping",
        desc: "Quotation marks (« ») in quiz questions no longer break onto a separate line from their word",
        type: "fix",
      },
      {
        title: "Portal components responsive fix",
        desc: "Dropdowns and date picker now use fixed positioning with viewport clamping — no more off-screen popups on mobile",
        type: "fix",
      },
      {
        title: "Version from package.json",
        desc: "App version is now read directly from package.json instead of an environment variable — single source of truth",
        type: "improvement",
      },
      {
        title: "Conjugation tenses data",
        desc: "Added tense data files for French and Spanish verbs to prepare for the upcoming conjugation overhaul",
        type: "feature",
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2025-03-15",
    features: [
      {
        title: "New date picker",
        desc: "Improved date selection in filters with a custom calendar picker that matches Frañol's design",
        type: "feature",
      },
      {
        title: "Content display adapted to your language",
        desc: "On the Spanish portal, words now appear as Spanish first then French. On the French portal, it's the opposite",
        type: "improvement",
      },
      {
        title: "Simpler discovery mode",
        desc: "Removed AI labels and badges from discovery mode for a cleaner experience — explanations are still available on request",
        type: "improvement",
      },
      {
        title: "Better dropdown",
        desc: "Dropdowns are now prettier and match Frañol's design. They include color badges from the corresponding categories and contexts",
        type: "improvement",
      },
      {
        title: "Better scrollbar styling",
        desc: "Dropdowns now have a thinner, more elegant scrollbar",
        type: "improvement",
      },
      {
        title: "Improved fun facts",
        desc: "The fun facts are now more engaging and varied",
        type: "improvement",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2025-03-14",
    features: [
      {
        title: "Articles and genders",
        desc: "Add articles (le/la, el/la) to your vocabulary for more precise learning",
        type: "feature",
      },
      {
        title: "Reflexive verbs",
        desc: "Identify reflexive verbs in French and Spanish to conjugate them better",
        type: "feature",
      },
      {
        title: "Verification system",
        desc: "Mark your content as verified and filter items to verify",
        type: "feature",
      },
      {
        title: "Duplicate detection",
        desc: "Automatic alert when adding a word already in your database",
        type: "feature",
      },
      {
        title: "Language fun facts",
        desc: "Discover interesting facts about French and Rioplatense Spanish during your quizzes",
        type: "feature",
      },
    ],
  },
];

/**
 * Get the current app version from package.json
 */
export function getCurrentVersion(): string {
  return packageJson.version;
}

/**
 * Get features for a specific version
 */
export function getReleaseByVersion(version: string): Release | undefined {
  return releases.find((r) => r.version === version);
}

/**
 * Get the latest release
 */
export function getLatestRelease(): Release | undefined {
  return releases[0];
}
