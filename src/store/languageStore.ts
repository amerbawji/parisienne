import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type TranslationKey } from '../data/translations';

type Language = 'en' | 'ar';

interface LanguageStore {
  language: Language;
  direction: 'ltr' | 'rtl';
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: 'ar',
      direction: 'rtl',
      setLanguage: (language) => {
        const direction = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = language;
        set({ language, direction });
      },
      t: (key: TranslationKey) => {
        const lang = get().language;
        return translations[lang][key] || key;
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ language: state.language }), // Only persist language
      onRehydrateStorage: () => (state) => {
        if (state) {
           document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
           document.documentElement.lang = state.language;
        }
      }
    }
  )
);
