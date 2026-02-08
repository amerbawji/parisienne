import { useRef, useState } from 'react';
import { ShoppingBagIcon, MagnifyingGlassIcon, PhoneIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuSelectionMode, setMenuSelectionMode] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

      // Use the image from JSON or a fallback if not present (though we ran a script to add it)
      const cat = category as typeof category & { image?: string };
      const image = cat.image || `https://placehold.co/600x200?text=${encodeURIComponent(category.name_en)}`;

      return { ...category, items: matchingItems, image };
    })
    .filter((category): category is typeof categories[0] & { image: string } => category !== null);

  const handleCategoryClick = (categoryId: string) => {
    setMenuSelectionMode(true);
    setExpandedCategory(categoryId);
    setExpandedItemId(null);
    requestAnimationFrame(() => {
      const target = categoryRefs.current[categoryId];
      if (!target) return;
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const targetTop = window.scrollY + target.getBoundingClientRect().top - headerHeight - 8;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 font-sans">
      <header ref={headerRef} className="bg-white shadow-sm sticky top-0 z-40" dir="ltr">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex justify-between items-center w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="h-12 w-40 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs font-semibold flex items-center justify-center">
                Logo Placeholder
              </div>
            </div>
          </div>

          <div className="relative w-full sm:max-w-md" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none",
              language === 'ar' ? "right-0 pr-3" : "left-0 pl-3"
            )}>
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className={cn(
                "block w-full py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out text-start",
                language === 'ar' ? "pr-10 pl-3" : "pl-10 pr-3"
              )}
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setMenuSelectionMode(false);
              }}
            />
          </div>

          <div className="absolute top-4 right-4 sm:static flex items-center gap-2">
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
            <LanguageToggle />
          </div>
        </div>

        {filteredCategories.length > 0 && (
          <div className="border-t border-gray-100">
            <div
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="flex gap-2 min-w-max">
                {filteredCategories.map((category) => {
                  const isActive = expandedCategory === category.id;
                  return (
                    <button
                      key={`menu-${category.id}`}
                      onClick={() => handleCategoryClick(category.id)}
                      className={cn(
                        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold border transition-colors',
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
                      )}
                    >
                      {language === 'ar' ? category.name_ar : category.name_en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[50vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const isOpen = menuSelectionMode
                ? expandedCategory === category.id
                : expandedCategory === category.id || searchQuery.length > 0;
              
              return (
                <div 
                  key={category.id} 
                  ref={(el) => {
                    categoryRefs.current[category.id] = el;
                  }}
                  className={cn(
                    "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group transition-all duration-300",
                    isOpen && "md:col-span-2 lg:col-span-3"
                  )}
                >
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="w-full text-left block transition-all hover:shadow-md"
                    aria-expanded={isOpen}
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <img 
                        src={category.image} 
                        alt={language === 'ar' ? category.name_ar : category.name_en}
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                        <h2 className="text-3xl font-bold text-white drop-shadow-md">
                          {language === 'ar' ? category.name_ar : category.name_en}
                        </h2>
                      </div>
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50/50">
                      <div className="p-4 sm:p-6 grid grid-cols-1 gap-4">
                        {category.items.map((item) => (
                          <MenuCard 
                            key={item.id} 
                            item={item as MenuItem} 
                            expanded={expandedItemId === item.id}
                            onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                          />
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

      <footer className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Contact & Hours</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="tel:01814841"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <PhoneIcon className="h-5 w-5 text-primary-700 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Phone</span>
                  <span className="font-semibold group-hover:text-primary-700">01814841</span>
                </span>
              </a>

              <a
                href="https://google.com/maps/place/Boucherie+%26+Grill+Parisienne/@33.8858255,35.4891462,4310m/data=!3m1!1e3!4m6!3m5!1s0x151f17786b8ee11d:0xded4c94a0912910c!8m2!3d33.8886653!4d35.4793747!16s%2Fg%2F11h3qrvgdp?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <MapPinIcon className="h-5 w-5 text-primary-700 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Address</span>
                  <span className="font-semibold group-hover:text-primary-700">Sakyet l Janzir</span>
                </span>
              </a>

              <a
                href="https://www.google.com/search?q=Parisienne+Beirut+opening+hours"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <ClockIcon className="h-5 w-5 text-primary-700 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">Operating Hours</span>
                  <span className="font-semibold group-hover:text-primary-700">7:30 am till 7 pm</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>

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
