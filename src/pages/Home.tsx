import { useState } from 'react';
import { ShoppingBagIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import menuData from '../data/menu.json';
import { MenuCard, type MenuItem } from '../components/Menu/MenuCard';
import { useCartStore } from '../store/cartStore';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import { CartSheet } from '../components/Cart/CartSheet';

export const Home = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { getTotalItems, toggleCart } = useCartStore();
  const totalItems = getTotalItems();

  const categories = menuData.categories;
  const filteredCategories = categories
    .map((category) => {
      // If we are searching, we ignore the active category unless the user wants to filter within it?
      // Usually, searching should search everything. If user specifically selected a category, we can respect that.
      if (activeCategory !== 'all' && category.id !== activeCategory) return null;

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
            </div>
          </div>

          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="ghost"
            className="relative hidden sm:flex"
            onClick={toggleCart}
            aria-label="Open cart"
          >
            <ShoppingBagIcon className="h-6 w-6 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-in zoom-in">
                {totalItems}
              </span>
            )}
          </Button>
        </div>

        {/* Category Filter Bar */}
        <div className="border-t border-gray-100 overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 py-3 min-w-max">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border",
                activeCategory === 'all' 
                  ? "bg-primary-600 text-white border-primary-600" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              )}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border",
                  activeCategory === cat.id 
                    ? "bg-primary-600 text-white border-primary-600" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                )}
              >
                {cat.name_en}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[50vh]">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <section key={category.id} className="mb-12 scroll-mt-32 animate-in fade-in slide-in-from-bottom-4 duration-500" id={category.id}>
              <div className="flex items-baseline justify-between mb-6 border-b border-gray-100 pb-2">
                <h2 className="text-2xl font-bold text-gray-900">{category.name_en}</h2>
                <span className="text-xl text-gray-400 font-arabic" dir="rtl">{category.name_ar}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.items.map((item) => (
                  <MenuCard key={item.id} item={item as MenuItem} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="text-center py-20 text-gray-500">
            No items found in this category.
          </div>
        )}
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