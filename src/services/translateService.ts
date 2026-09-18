import { LanguageCode } from '../types';

// Default to local self-hosted LibreTranslate, fallback to public if not specified in env
const DEFAULT_API_URL = 'http://localhost:5000/translate';
const LIBRETRANSLATE_API_URL = import.meta.env.VITE_LIBRETRANSLATE_URL || DEFAULT_API_URL;

const CACHE_PREFIX = 'libretranslate_cache_';

export class TranslateService {
  /**
   * Translates a single string using LibreTranslate.
   * Includes localStorage caching.
   */
  static async translateText(text: string, sourceLang: string, targetLang: LanguageCode): Promise<string> {
    if (!text || !text.trim()) return text;
    if (sourceLang === targetLang) return text;

    const cacheKey = `${CACHE_PREFIX}${sourceLang}_${targetLang}_${text}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(LIBRETRANSLATE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translatedText;
      
      if (translatedText) {
         localStorage.setItem(cacheKey, translatedText);
         return translatedText;
      }
      
      return text;
    } catch (error) {
      console.warn('Local translation server unreachable, attempting direct fallback...', error);
      try {
        const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const fallbackTranslated = fallbackData?.responseData?.translatedText;
          if (fallbackTranslated && !fallbackTranslated.startsWith('MYMEMORY WARNING:')) {
            localStorage.setItem(cacheKey, fallbackTranslated);
            return fallbackTranslated;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback translation also failed:', fallbackErr);
      }
      return text; // Graceful fallback
    }
  }

  /**
   * Translates an array of strings in a single batch (if supported by the endpoint).
   * Note: LibreTranslate typically expects 'q' to be an array of strings for batching.
   */
  static async translateBatch(texts: string[], sourceLang: string, targetLang: LanguageCode): Promise<string[]> {
    if (!texts || texts.length === 0) return [];
    if (sourceLang === targetLang) return texts;

    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];
    const results: string[] = new Array(texts.length);

    // Check cache first
    texts.forEach((text, index) => {
      const cacheKey = `${CACHE_PREFIX}${sourceLang}_${targetLang}_${text}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        results[index] = cached;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    if (uncachedTexts.length === 0) {
      return results;
    }

    try {
      const response = await fetch(LIBRETRANSLATE_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          q: uncachedTexts,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Translation batch API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedTexts = data.translatedText; // LibreTranslate returns an array if q is an array

      if (Array.isArray(translatedTexts)) {
        translatedTexts.forEach((translatedText, i) => {
          const originalIndex = uncachedIndices[i];
          const originalText = uncachedTexts[i];
          results[originalIndex] = translatedText;
          
          // Cache the new translation
          const cacheKey = `${CACHE_PREFIX}${sourceLang}_${targetLang}_${originalText}`;
          localStorage.setItem(cacheKey, translatedText);
        });
      } else {
         // Fallback if API doesn't return array as expected
         uncachedIndices.forEach(idx => {
             results[idx] = texts[idx];
         });
      }
      return results;
    } catch (error) {
      console.error('Batch translation failed:', error);
      // Fallback to original texts for failed translations
      uncachedIndices.forEach(idx => {
         results[idx] = texts[idx];
      });
      return results;
    }
  }
}
