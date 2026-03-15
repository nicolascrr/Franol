/**
 * Release notes history for Frañol
 * Only user-facing features, written in English
 */

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
 * Get the current app version
 */
export function getCurrentVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
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
