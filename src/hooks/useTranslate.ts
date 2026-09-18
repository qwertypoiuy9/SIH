import { useCallback, useState } from 'react';
import { useKisanQ } from '../context/KisanFlowContext';
import { translations } from '../translations';
import { TranslateService } from '../services/translateService';
import { LanguageCode } from '../types';

export const useTranslate = () => {
  const { language, setIsTranslating } = useKisanQ();
  const [localTranslating, setLocalTranslating] = useState(false);

  /**
   * Helper to determine if we should fall back to English if the dictionary is missing a key.
   * Currently, the app defaults to English for missing keys in other languages.
   * But we want to translate them via the API if they are missing in the current language.
   */
  const getStaticTranslation = (key: string, targetLang: LanguageCode): string | undefined => {
    const dict = translations[targetLang];
    if (dict && (dict as any)[key]) {
      return (dict as any)[key];
    }
    return undefined;
  };

  /**
   * Translates a single text dynamically if not found in the static dictionary.
   */
  const t = useCallback(
    async (key: string, text: string): Promise<string> => {
      // 1. Check static dictionary
      const staticText = getStaticTranslation(key, language);
      if (staticText) {
        return staticText;
      }

      // 2. Dynamic translation
      try {
        setLocalTranslating(true);
        // Assuming the base language of the hardcoded text is English
        const translated = await TranslateService.translateText(text, 'en', language);
        return translated;
      } catch (err) {
        console.error('Translation failed:', err);
        return text;
      } finally {
        setLocalTranslating(false);
      }
    },
    [language]
  );

  return { t, isTranslating: localTranslating };
};
