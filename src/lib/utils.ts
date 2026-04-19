import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Prevents guillemets (« ») from being separated from their content
 * by replacing regular spaces with non-breaking spaces (U+00A0).
 */
export function fixGuillemets(text: string): string {
  return text
    .replace(/ »/g, '\u00A0»')
    .replace(/« /g, '«\u00A0');
}
