import { useState } from 'react';
import { ShoppingBagIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import menuData from '../data/menu.json';
import { MenuCard, type MenuItem } from '../components/Menu/MenuCard';
import { useCartStore } from '../store/cartStore';
import { useLanguageStore } from '../store/languageStore';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import { CartSheet } from '../components/Cart/CartSheet';
import { LanguageToggle } from '../components/UI/LanguageToggle';

export const Home = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { getTotalItems, toggleCart } = useCartStore();
  const { language, t } = useLanguageStore();
  const totalItems = getTotalItems();

  const categories = menuData.categories;
  const filteredCategories = categories
    .map((category) => {
      const matchingItems = category.items.filter((item) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.name_en.toLowerCase().includes(query) ||
          item.name_ar.includes(query) ||
          (item.description_en && item.description_en.toLowerCase().includes(query)) ||
          (item.description_ar && item.description_ar.includes(query))
        );
      });

      if (matchingItems.length === 0) return null;

      return { ...category, items: matchingItems };
    })
    .filter((category): category is typeof categories[0] => category !== null);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex justify-between items-center w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-primary-900">Parisienne</h1>
              <LanguageToggle className="ml-2" />
            </div>
          </div>

          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none rtl:right-0 rtl:left-auto rtl:pr-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out text-start"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="ghost"
            className="relative hidden sm:flex"
            onClick={toggleCart}
            aria-label={t('view_cart')}
          >
            <ShoppingBagIcon className="h-6 w-6 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-in zoom-in">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[50vh]">
        <div className="space-y-4">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const isOpen = expandedCategory === category.id || searchQuery.length > 0;
              
              return (
                <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">
                        {language === 'ar' ? category.name_ar : category.name_en}
                      </h2>
                      <span className="text-sm text-gray-500 font-normal">
                        ({category.items.length})
                      </span>
                    </div>
                    <ChevronDownIcon 
                      className={cn("h-6 w-6 text-gray-400 transition-transform duration-200", 
                        isOpen ? "transform rotate-180" : ""
                      )} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 border-t border-gray-50 mt-2 pt-6">
                        {category.items.map((item) => (
                          <MenuCard key={item.id} item={item as MenuItem} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 text-gray-500">
              {t('no_items_found')}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button (Mobile) */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <Button
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg shadow-primary-600/30 bg-primary-600 hover:bg-primary-700 text-white relative"
          onClick={toggleCart}
          aria-label="View Cart"
        >
          <ShoppingBagIcon className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white animate-in zoom-in">
              {totalItems}
            </span>
          )}
        </Button>
      </div>

      <CartSheet />
    </div>
  );
};
