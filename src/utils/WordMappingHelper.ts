import { WordMappingItem } from '../types';

/**
 * Applies word mapping rules to substitute target words in text.
 * Only applied on the client side ('saya').
 * The peer ('dia') always sees the untransformed text.
 */
export function applyWordMapping(text: string, mappings: WordMappingItem[]): string {
  if (!text || !mappings || mappings.length === 0) return text;

  // Filter only active mappings with valid words
  const activeMappings = mappings.filter(
    (m) => m.enabled !== false && m.originalWord?.trim() && m.mappedWord?.trim()
  );

  if (activeMappings.length === 0) return text;

  let result = text;

  for (const item of activeMappings) {
    const orig = item.originalWord.trim();
    const mapped = item.mappedWord.trim();

    // Escape regex special characters
    const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // If orig consists only of letters/numbers/underscores, use word boundaries to avoid replacing inside other words
    const isWord = /^[\w\u00C0-\u024F]+$/.test(orig);
    const pattern = isWord ? new RegExp(`\\b${escaped}\\b`, 'gi') : new RegExp(escaped, 'gi');

    result = result.replace(pattern, (matched) => {
      // Preserve uppercase if the matched word is in all-caps and > 1 char
      if (matched === matched.toUpperCase() && orig.length > 1) {
        return mapped.toUpperCase();
      }
      // Preserve title case (first letter capitalized)
      if (matched[0] === matched[0].toUpperCase()) {
        return mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return mapped;
    });
  }

  return result;
}
