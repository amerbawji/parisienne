import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../store/cartStore';
import { CartContent } from '../components/Cart/CartContent';
import { useLanguageStore } from '../store/languageStore';

export const Cart = () => {
  const { getTotalItems } = useCartStore();
  const { language, t } = useLanguageStore();
  const totalItems = getTotalItems();
  const isArabic = language === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700 transition-colors p-2 -ml-1 rounded-full hover:bg-gray-100 min-h-11 min-w-11 inline-flex items-center justify-center">
            {isArabic ? <ArrowRightIcon className="h-6 w-6" /> : <ArrowLeftIcon className="h-6 w-6" />}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{t('cart_title')} ({totalItems})</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto h-[calc(100vh-80px)]">
        <CartContent />
      </main>
    </div>
  );
};
