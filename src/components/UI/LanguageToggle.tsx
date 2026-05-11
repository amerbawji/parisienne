import { useLanguageStore } from '../../store/languageStore';
import { cn } from '../../utils/cn';

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      className={cn(
        "h-10 px-3 text-sm font-semibold rounded-xl bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors",
        language === 'ar' ? "font-arabic" : "",
        className
      )}
    >
      {language === 'en' ? 'عربي' : 'EN'}
    </button>
  );
};
