import { useLanguageStore } from '../../store/languageStore';
import { cn } from '../../utils/cn';

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className={cn("flex items-center gap-1 bg-gray-100 rounded-lg p-1", className)}>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2 py-1 text-xs font-medium rounded-md transition-colors",
          language === 'en'
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ar')}
        className={cn(
          "px-2 py-1 text-xs font-bold rounded-md transition-colors font-arabic",
          language === 'ar'
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        عربي
      </button>
    </div>
  );
};
