import { useDeferredValue, useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { ShoppingBagIcon, MagnifyingGlassIcon, PhoneIcon, MapPinIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import logo from '../assets/malhame-horizontal-logo.svg';
import { MenuCard, type MenuItem } from '../components/Menu/MenuCard';
import { useCartStore } from '../store/cartStore';
import { useLanguageStore } from '../store/languageStore';
import { useMenuStore } from '../store/menuStore';
import { usePromoStore } from '../store/promoStore';
import { useStoreConfigStore } from '../store/storeConfigStore';
import { useLastOrderStore } from '../store/lastOrderStore';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import { CartSheet } from '../components/Cart/CartSheet';
import { LanguageToggle } from '../components/UI/LanguageToggle';
import { InstallPrompt } from '../components/UI/InstallPrompt';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CategoryBannerImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && <div className="absolute inset-0 bg-gray-300 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover object-center transition-all duration-500 sm:group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
});

const to12h = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const Home = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuSelectionMode, setMenuSelectionMode] = useState(false);
  const promoEnabled = usePromoStore((state) => state.enabled);
  const promoImage = usePromoStore((state) => state.image);
  const promoLoading = usePromoStore((state) => state.loading);
  const fetchPromo = usePromoStore((state) => state.fetchPromo);
  const fetchMenu = useMenuStore((state) => state.fetchMenu);
  const fetchConfig = useStoreConfigStore((state) => state.fetchConfig);
  const open_time = useStoreConfigStore((state) => state.open_time);
  const close_time = useStoreConfigStore((state) => state.close_time);
  const isOpen = useStoreConfigStore((s) => s.isOpen());
  const configLoading = useStoreConfigStore((state) => state.loading);
  const menuLoading = useMenuStore((state) => state.loading);
  const [showSplashPromo, setShowSplashPromo] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ instanceId: string; itemName: string } | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const desktopCategoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(80);
  const cartItems = useCartStore((state) => state.items);
  const storeCategories = useMenuStore((state) => state.categories);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const lastOrderPhone = useLastOrderStore((s) => s.phone);
  const lastOrderNumber = useLastOrderStore((s) => s.orderNumber);
  const { language, t } = useLanguageStore();
  const navigate = useNavigate();

  const [trackingInfo, setTrackingInfo] = useState<{ status: string; orderNumber: number | null; orderCount: number } | null>(null);

  useEffect(() => {
    if (!lastOrderPhone) return;
    supabase
      .from('orders')
      .select('status, order_number')
      .eq('customer_phone', lastOrderPhone)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setTrackingInfo({ status: data[0].status, orderNumber: data[0].order_number ?? null, orderCount: data.length });
      });
  }, [lastOrderPhone]);
  const totalItems = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        if (item.step && item.step < 1) {
          return total + 1;
        }
        return total + item.quantity;
      }, 0),
    [cartItems]
  );
  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const categories = useMemo(
    () => storeCategories.filter((category) => category.active !== false),
    [storeCategories]
  );
  const hideItemsWithoutImage = useStoreConfigStore((s) => s.hide_items_without_image);

  const filteredCategories = useMemo(
    () => {
      const query = deferredSearchQuery.trim().toLowerCase();
      return categories
        .map((category) => {
          const matchingItems = category.items.filter((item) => {
            if (item.active === false) return false;
            if (hideItemsWithoutImage && !item.image) return false;
            if (!query) return true;
            return (
              item.name_en.toLowerCase().includes(query) ||
              item.name_ar.includes(query) ||
              (item.description_en && item.description_en.toLowerCase().includes(query)) ||
              (item.description_ar && item.description_ar.includes(query))
            );
          });

          if (matchingItems.length === 0) return null;

          const image = category.image || `https://placehold.co/600x200?text=${encodeURIComponent(category.name_en)}`;

          return { ...category, items: matchingItems, image };
        })
        .filter((category): category is typeof categories[0] & { image: string } => category !== null);
    },
    [categories, deferredSearchQuery, hideItemsWithoutImage]
  );
  useEffect(() => {
    Promise.all([fetchMenu(), fetchPromo(), fetchConfig()]);
  }, []);

  // Track sticky header height for sidebar positioning
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => setHeaderHeight(headerRef.current?.offsetHeight ?? 80));
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  // Scroll-spy: highlight active sidebar category as user scrolls
  useEffect(() => {
    const els = Object.values(desktopCategoryRefs.current).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveCatId(entry.target.getAttribute('data-cat-id'));
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredCategories, hideItemsWithoutImage]);

  useEffect(() => {
    if (!menuLoading && !promoLoading) setShowSplashPromo(promoEnabled && !!promoImage);
  }, [menuLoading, promoLoading, promoEnabled]);

  useEffect(() => {
    if (!lastAdded) return;
    const timeout = window.setTimeout(() => {
      setLastAdded(null);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [lastAdded]);

  useEffect(() => {
    if (!modalItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalItem(null); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [modalItem]);

  const handleItemToggle = useCallback((item: MenuItem) => {
    setModalItem(item);
  }, []);

  const pendingScrollRef = useRef<string | null>(null);

  useEffect(() => {
    const categoryId = pendingScrollRef.current;
    if (!categoryId) return;
    pendingScrollRef.current = null;

    const r = requestAnimationFrame(() => {
      const target = categoryRefs.current[categoryId];
      if (!target) return;
      target.style.scrollMarginTop = `${(headerRef.current?.offsetHeight ?? 0) + 12}px`;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(r);
  }, [expandedCategory]);

  const modalRelatedItems = useMemo(() => {
    if (!modalItem) return [];
    const cat = filteredCategories.find((c) => c.items.some((i) => i.id === modalItem.id));
    return (cat?.items.filter((i) => i.id !== modalItem.id && i.show_in_related !== false) ?? []) as MenuItem[];
  }, [modalItem, filteredCategories]);

  const handleCategoryClick = (categoryId: string) => {
    setMenuSelectionMode(true);
    pendingScrollRef.current = categoryId;
    setExpandedCategory(categoryId);
  };

  return (
    <div className={`bg-gray-50 font-sans ${totalItems > 0 ? 'pb-safe-36 sm:pb-safe-24' : 'pb-8'}`}>
      {showSplashPromo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-3xl rounded-2xl overflow-hidden bg-white shadow-2xl border border-gray-200">
            <button
              onClick={() => setShowSplashPromo(false)}
              className="absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-black/60 text-white hover:bg-black/75 transition-colors flex items-center justify-center"
              aria-label={t('close_promo')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            <img
              src={promoImage!}
              alt={t('promo_offer_alt')}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      )}

      <header ref={headerRef} className="bg-white shadow-sm sticky top-0 z-40" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-4 sm:items-center">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 sm:h-10 lg:h-12">
                <img src={logo} alt="Parisienne Logo" className="h-full w-auto object-contain" />
              </div>
            </div>
            <LanguageToggle className="sm:hidden" />
          </div>

          <div className="relative w-full sm:max-w-md sm:justify-self-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none",
              language === 'ar' ? "right-0 pr-3" : "left-0 pl-3"
            )}>
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <label htmlFor="menu-search" className="sr-only">
              {t('search_placeholder')}
            </label>
            <input
              id="menu-search"
              type="text"
              className={cn(
                "block w-full h-11 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition duration-150 ease-in-out text-start",
                language === 'ar' ? "pr-10 pl-11" : "pl-10 pr-11"
              )}
              placeholder={t('search_placeholder')}
              aria-label={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setMenuSelectionMode(false);
              }}
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={cn(
                  "absolute inset-y-0 flex items-center text-xs text-gray-500 hover:text-gray-700 px-2",
                  language === 'ar' ? "left-1" : "right-1"
                )}
                aria-label={t('clear_search')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 w-full sm:w-auto justify-end">
             <Button
              variant="ghost"
              className="relative hidden sm:flex"
              onClick={toggleCart}
              aria-label={t('view_cart')}
            >
              <ShoppingBagIcon className="h-6 w-6 text-gray-700" />
              {totalItems > 0 && (
                <span className={cn(
                  "absolute -top-1 bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-in zoom-in",
                  language === 'ar' ? "-left-1" : "-right-1"
                )}>
                  {totalItems}
                </span>
              )}
            </Button>
            <LanguageToggle />
          </div>
        </div>

        {filteredCategories.length > 0 && (
          <div className="border-t border-gray-100 lg:hidden">
            <div
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="flex gap-2 min-w-max lg:min-w-0 lg:flex-wrap">
                {filteredCategories.map((category) => {
                  const isActive = menuSelectionMode && expandedCategory === category.id;
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

      {!configLoading && !isOpen && (
        <div className="bg-amber-50 border-b border-amber-200" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2.5">
            <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-800 font-medium">
              {language === 'ar'
                ? `المتجر مغلق حالياً (${to12h(open_time)} – ${to12h(close_time)}) — نقبل الطلبات المجدولة فقط`
                : `We're currently closed (${to12h(open_time)} – ${to12h(close_time)}) — accepting scheduled orders only`}
            </p>
          </div>
        </div>
      )}

      {/* Order tracking banner */}
      {trackingInfo && cartItems.length === 0 && (() => {
        const STATUS_LABELS: Record<string, { en: string; ar: string; color: string; icon: string }> = {
          new:       { en: 'Order received',  ar: 'تم استلام طلبك',  color: 'text-blue-700 bg-blue-50',    icon: '🕐' },
          confirmed: { en: 'Confirmed',        ar: 'تم تأكيد طلبك',  color: 'text-yellow-700 bg-yellow-50', icon: '✅' },
          preparing: { en: 'Being prepared',   ar: 'يتم التحضير',    color: 'text-orange-700 bg-orange-50', icon: '👨‍🍳' },
          ready:     { en: 'Ready for pickup', ar: 'جاهز للاستلام',  color: 'text-purple-700 bg-purple-50', icon: '🎁' },
          delivered: { en: 'Delivered',        ar: 'تم التوصيل',     color: 'text-green-700 bg-green-50',   icon: '🎉' },
          cancelled: { en: 'Cancelled',        ar: 'تم الإلغاء',     color: 'text-red-700 bg-red-50',       icon: '❌' },
        };
        const si = STATUS_LABELS[trackingInfo.status] ?? { en: trackingInfo.status, ar: trackingInfo.status, color: 'text-gray-600 bg-gray-50', icon: '•' };
        const trackUrl = lastOrderPhone
          ? trackingInfo.orderCount === 1 && lastOrderNumber
            ? `/track?phone=${encodeURIComponent(lastOrderPhone)}&order=${lastOrderNumber}`
            : `/track?phone=${encodeURIComponent(lastOrderPhone)}`
          : '/track';
        return (
          <button
            type="button"
            onClick={() => navigate(trackUrl)}
            className="w-full bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{si.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {trackingInfo.orderNumber != null
                      ? `${language === 'ar' ? 'طلب' : 'Order'} #${trackingInfo.orderNumber}`
                      : (language === 'ar' ? 'آخر طلب' : 'Latest order')}
                  </p>
                  <p className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${si.color}`}>
                    {language === 'ar' ? si.ar : si.en}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary-600">
                {language === 'ar' ? 'تتبع ←' : 'Track →'}
              </span>
            </div>
          </button>
        );
      })()}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {menuLoading ? (
          <>
            {/* Mobile skeletons */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="relative h-48 w-full bg-gray-200 animate-pulse">
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-gray-300/60 to-transparent" />
                    <div className="absolute bottom-5 left-5 h-5 w-32 bg-gray-300 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop skeletons */}
            <div className="hidden lg:flex gap-8">
              <div className="w-52 xl:w-60 shrink-0 space-y-2 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" style={{ width: `${55 + (i * 13) % 40}%` }} />
                ))}
              </div>
              <div className="flex-1 space-y-10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                      <div className="h-6 w-36 bg-gray-200 rounded-md animate-pulse" />
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-px gap-y-2">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="bg-white rounded-xl flex gap-3 p-3">
                          <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-3.5 bg-gray-200 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── Desktop: sidebar + always-expanded sections ── */}
            <div className="hidden lg:flex gap-8 items-start">
              {/* Sidebar */}
              <aside
                className="w-52 xl:w-60 shrink-0 sticky overflow-y-auto scrollbar-hide"
                style={{ top: headerHeight + 16, maxHeight: `calc(100vh - ${headerHeight + 32}px)` }}
              >
                {filteredCategories.length > 0 && (
                  <nav className="flex flex-col gap-0.5" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                      {language === 'ar' ? 'القائمة' : 'Menu'}
                    </p>
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          const target = desktopCategoryRefs.current[cat.id];
                          if (!target) return;
                          target.style.scrollMarginTop = `${headerHeight + 16}px`;
                          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={cn(
                          'text-start px-3 py-2 rounded-lg text-sm transition-colors',
                          activeCatId === cat.id
                            ? 'bg-primary-50 text-primary-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 font-medium'
                        )}
                      >
                        {language === 'ar' ? cat.name_ar : cat.name_en}
                      </button>
                    ))}
                  </nav>
                )}

              </aside>

              {/* Sections */}
              <div className="flex-1 min-w-0 space-y-10 min-w-0">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <section
                      key={cat.id}
                      ref={(el) => { desktopCategoryRefs.current[cat.id] = el; }}
                      data-cat-id={cat.id}
                    >
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          <img src={cat.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">
                            {language === 'ar' ? cat.name_ar : cat.name_en}
                          </h2>
                          <p className="text-xs text-gray-400">
                            {cat.items.length} {language === 'ar' ? 'صنف' : 'items'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-px gap-y-2">
                        {cat.items.map((item) => (
                          <MenuCard
                            key={item.id}
                            item={item as MenuItem}
                            expanded={false}
                            onToggle={() => handleItemToggle(item as MenuItem)}
                            onItemAdded={(payload) => setLastAdded(payload)}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-500">{t('no_items_found')}</div>
                )}
              </div>

            </div>

            {/* ── Mobile: tap-to-expand category cards ── */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => {
                  const isOpen = menuSelectionMode
                    ? expandedCategory === category.id
                    : expandedCategory === category.id || searchQuery.length > 0;
                  return (
                    <div
                      key={category.id}
                      ref={(el) => { categoryRefs.current[category.id] = el; }}
                      className={cn(
                        'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group transition-all duration-300',
                        isOpen && 'md:col-span-2'
                      )}
                    >
                      <button
                        onClick={() => {
                          if (expandedCategory === category.id) setExpandedCategory(null);
                          else handleCategoryClick(category.id);
                        }}
                        className="w-full text-start block transition-all hover:shadow-md"
                        aria-expanded={isOpen}
                      >
                        <div className="relative h-48 w-full overflow-hidden">
                          <CategoryBannerImage
                            src={category.image}
                            alt={language === 'ar' ? category.name_ar : category.name_en}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                            <h2 className="text-3xl font-bold text-white drop-shadow-md">
                              {language === 'ar' ? category.name_ar : category.name_en}
                            </h2>
                          </div>
                        </div>
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="bg-gray-50/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-px gap-y-2">
                              {category.items.map((item) => (
                                <MenuCard
                                  key={item.id}
                                  item={item as MenuItem}
                                  expanded={false}
                                  onToggle={() => handleItemToggle(item as MenuItem)}
                                  onItemAdded={(payload) => setLastAdded(payload)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-gray-500 col-span-full">
                  {t('no_items_found')}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">{t('contact_hours')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href="tel:01814841"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <PhoneIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">{t('phone')}</span>
                  <span className="font-semibold group-hover:text-primary-700">01814841</span>
                </span>
              </a>

              <a
                href="https://google.com/maps/place/Boucherie+%26+Grill+Parisienne/@33.8858255,35.4891462,4310m/data=!3m1!1e3!4m6!3m5!1s0x151f17786b8ee11d:0xded4c94a0912910c!8m2!3d33.8886653!4d35.4793747!16s%2Fg%2F11h3qrvgdp?entry=ttu&g_ep=EgoyMDI2MDIwNC4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <MapPinIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">{t('address')}</span>
                  <span className="font-semibold group-hover:text-primary-700">{t('store_location')}</span>
                </span>
              </a>

              <a
                href="https://www.google.com/search?q=Parisienne+Beirut+opening+hours"
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 transition-colors p-3 flex items-start gap-3"
              >
                <ClockIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                <span className="text-sm text-gray-700">
                  <span className="block text-xs text-gray-500">{t('operating_hours')}</span>
                  <span className="font-semibold group-hover:text-primary-700">{to12h(open_time)} – {to12h(close_time)}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {lastAdded && (
        <div
          className={cn(
            "fixed z-50 bottom-24 sm:bottom-8 rounded-2xl shadow-2xl bg-gray-900 text-white border border-gray-700/70 w-[min(92vw,30rem)] overflow-hidden",
            language === 'ar' ? "left-4 sm:left-6" : "right-4 sm:right-6"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <CheckCircleIcon className="h-5 w-5 text-secondary-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-gray-300">{t('added_to_cart')}</p>
              <p className="text-sm font-medium line-clamp-2 leading-snug">{lastAdded.itemName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="h-9 px-3 rounded-lg bg-amber-300 text-gray-900 text-sm font-semibold hover:bg-amber-200 active:scale-[0.98] transition"
                onClick={() => {
                  removeItem(lastAdded.instanceId);
                  setLastAdded(null);
                }}
              >
                {t('undo')}
              </button>
              <button
                type="button"
                className="h-9 w-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
                aria-label={t('close_promo')}
                onClick={() => setLastAdded(null)}
              >
                <XMarkIcon className="h-5 w-5 mx-auto" />
              </button>
            </div>
          </div>
          <div className="h-1 bg-white/10">
            <div className="h-full w-full bg-secondary-400/80 animate-[shrink_4s_linear_forwards]" />
          </div>
        </div>
      )}

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6 safe-area-bottom">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-gray-200 shadow-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{t('items')} {totalItems}</p>
              <p className="text-lg font-bold text-gray-900">${subtotal.toFixed(2)}</p>
            </div>
            <Button onClick={toggleCart} className="h-11 px-5 shrink-0">
              {t('view_cart')}
            </Button>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Mobile when cart is empty) */}
      <div className={cn("fixed bottom-6 z-40 sm:hidden", language === 'ar' ? "left-6" : "right-6", totalItems > 0 && "hidden")}>
        <Button
          className="rounded-full w-14 h-14 p-0 flex items-center justify-center shadow-lg shadow-primary-600/30 bg-primary-600 hover:bg-primary-700 text-white relative"
          onClick={toggleCart}
          aria-label={t('view_cart')}
        >
          <ShoppingBagIcon className="h-6 w-6" />
          {totalItems > 0 && (
            <span className={cn(
              "absolute -top-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white animate-in zoom-in",
              language === 'ar' ? "-left-1" : "-right-1"
            )}>
              {totalItems}
            </span>
          )}
        </Button>
      </div>

      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/50 animate-in fade-in duration-150"
          onClick={() => setModalItem(null)}
        >
          <div
            className="w-full sm:max-w-xl lg:max-w-3xl bg-gray-50 flex flex-col h-dvh sm:h-auto sm:max-h-[88vh] sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 sm:duration-150"
            style={{ willChange: 'transform' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
              <span className="text-lg font-medium text-gray-900">
                {language === 'ar' ? modalItem.name_ar : modalItem.name_en}
              </span>
              <button
                type="button"
                className="relative -m-2 p-2 text-gray-400 hover:text-gray-500"
                onClick={() => setModalItem(null)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <MenuCard
                item={modalItem}
                expanded={true}
                onToggle={() => setModalItem(null)}
                onItemAdded={(payload) => { setLastAdded(payload); setModalItem(null); }}
                relatedItems={modalRelatedItems}
                onRelatedItemSelect={(rel) => setModalItem(rel)}
              />
            </div>
          </div>
        </div>
      )}

      <CartSheet />
      <InstallPrompt />
    </div>
  );
};
