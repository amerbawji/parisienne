import { useLanguageStore } from '../../store/languageStore';
import { cn } from '../../utils/cn';

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className={cn("flex items-center gap-1 bg-white rounded-xl p-1.5", className)}>
      <button
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={cn(
          "h-10 px-3 text-sm font-semibold rounded-lg transition-colors",
          language === 'en'
            ? "bg-primary-600 text-white shadow-sm"
            : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ar')}
        aria-pressed={language === 'ar'}
        className={cn(
          "h-10 px-3 text-sm font-bold rounded-lg transition-colors font-arabic",
          language === 'ar'
            ? "bg-primary-600 text-white shadow-sm"
            : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
        )}
      >
        عربي
      </button>
    </div>
  );
};
