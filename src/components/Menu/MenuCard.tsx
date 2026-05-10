import { memo, useMemo, useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { useStoreConfigStore } from '../../store/storeConfigStore';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button } from '../UI/Button';
import { QuantitySelector } from '../UI/QuantitySelector';
import { type TranslationKey } from '../../data/translations';
import { type Preset } from '../../store/menuStore';

export interface MenuItem {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  description_en?: string;
  description_ar?: string;
  image?: string;
  unit?: string;
  weight_step?: number;
  min_quantity?: number;
  options?: { name: string; name_ar?: string; choices: string[]; choices_ar?: string[] }[];
  option_price_overrides?: Record<string, Record<string, number>>;
  presets?: Preset[];
  in_stock?: boolean;
}

interface MenuCardProps {
  item: MenuItem;
  expanded: boolean;
  onToggle: () => void;
  onItemAdded?: (payload: { instanceId: string; itemName: string }) => void;
}

const safeT = (t: (key: TranslationKey) => string, key: string, fallback: string) => {
  const translated = t(key as TranslationKey);
  if (translated === key) return fallback;
  return translated;
};

const MenuCardComponent = ({ item, expanded, onToggle, onItemAdded }: MenuCardProps) => {
  const { language, t } = useLanguageStore();
  const discountPct = useStoreConfigStore((s) => s.discount_percentage);
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const cartInstances = useMemo(() => cartItems.filter((i) => i.id === item.id), [cartItems, item.id]);
  const totalQuantity = cartInstances.reduce((acc, i) => acc + i.quantity, 0);

  const [pendingOptions, setPendingOptions] = useState<Record<string, string>>({});
  
  const step = item.weight_step || 1;
  const minQuantity = item.unit === 'kg' && step < 1 && (!item.min_quantity || item.min_quantity >= 1)
    ? 0.5
    : (item.min_quantity || 1);
  const round = (num: number) => Math.round(num * 100) / 100;

  const [pendingInstructions, setPendingInstructions] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState(minQuantity);

  const getUnitPrice = (): number | null => {
    const overrides = item.option_price_overrides;
    if (!overrides) return item.price;

    let matchedPrice: number | null = null;

    Object.entries(pendingOptions).forEach(([optionName, choice]) => {
      const priceForChoice = overrides[optionName]?.[choice];
      if (typeof priceForChoice === 'number') {
        matchedPrice = priceForChoice;
      }
    });

    return matchedPrice;
  };

  const unitPrice = getUnitPrice();
  const discountedUnitPrice = unitPrice === null ? null : round(unitPrice * (1 - discountPct / 100));
  const previewTotal = discountedUnitPrice === null ? null : round(discountedUnitPrice * pendingQuantity);

  const handleAddToCart = () => {
    if (unitPrice === null || discountedUnitPrice === null) return;

    const instanceId = addItem({
      id: item.id,
      name: language === 'ar' ? item.name_ar : item.name_en, // Current display name
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: discountedUnitPrice,
      selectedOptions: pendingOptions,
      instructions: pendingInstructions,
      step,
      minQuantity,
      quantity: pendingQuantity,
    });
    onItemAdded?.({ instanceId, itemName: language === 'ar' ? item.name_ar : item.name_en });
    setPendingOptions({});
    setPendingInstructions('');
    setPendingQuantity(minQuantity);
    if (expanded) onToggle();
  };

  const handleOptionChange = (optionName: string, choice: string) => {
    setPendingOptions((prev) => {
      if (prev[optionName] === choice) {
        const next = { ...prev };
        delete next[optionName];
        return next;
      }
      return { ...prev, [optionName]: choice };
    });
  };

  const togglePreset = (preset: Preset) => {
    const text = language === 'ar' ? preset.ar : preset.en;
    const current = pendingInstructions;
    let newInstructions = current;

    if (current.includes(text)) {
      newInstructions = current.replace(text, '').replace(/،\s*،/g, '،').replace(/,\s*,/g, ',').replace(/^[،,]\s*/, '').replace(/\s*[،,]$/, '');
    } else {
      const sep = language === 'ar' ? '، ' : ', ';
      newInstructions = current ? `${current}${sep}${text}` : text;
    }
    setPendingInstructions(newInstructions);
  };

  const presets = item.presets || [];
  const imageUrl = item.image || `https://placehold.co/400x300?text=${encodeURIComponent(item.name_en)}`;
  const quickAddEnabled = !item.option_price_overrides;
  const inStock = item.in_stock !== false;

  const displayName = language === 'ar' ? item.name_ar : item.name_en;
  const displayDesc = language === 'ar' ? item.description_ar : item.description_en;
  const shouldShowUnit = Boolean(item.unit && item.unit !== 'piece');

  const handleQuickAdd = () => {
    if (!quickAddEnabled) {
      onToggle();
      return;
    }
    const effectivePrice = round(item.price * (1 - discountPct / 100));
    const instanceId = addItem({
      id: item.id,
      name: displayName,
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: effectivePrice,
      selectedOptions: {},
      instructions: '',
      step,
      minQuantity,
      quantity: minQuantity,
    });
    onItemAdded?.({ instanceId, itemName: displayName });
  };

  const handleQuickDecrease = () => {
    const targetInstance = [...cartInstances]
      .reverse()
      .find((instance) => Object.keys(instance.selectedOptions || {}).length === 0) || cartInstances[cartInstances.length - 1];

    if (!targetInstance) return;

    const targetMin = targetInstance.minQuantity ?? minQuantity;
    const targetStep = targetInstance.step ?? step;
    const nextQuantity = round(targetInstance.quantity - targetStep);

    if (nextQuantity >= targetMin - 0.001) {
      updateQuantity(targetInstance.instanceId, nextQuantity);
      return;
    }

    removeItem(targetInstance.instanceId);
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden flex transition-shadow group ${expanded ? 'flex-col shadow-sm' : 'flex-row gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:shadow-md'} ${!inStock ? 'opacity-60' : ''}`}
      onClick={() => !expanded && onToggle()}
    >
      {/* ── EXPANDED layout ── */}
      {expanded && (
        <>
          <div
            className="relative w-full h-52 sm:h-64 bg-gray-200 cursor-pointer shrink-0"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            <img src={imageUrl} alt={displayName} className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            {!inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="bg-white/90 text-gray-700 text-xs font-bold px-3 py-1 rounded-full shadow">{language === 'ar' ? 'غير متوفر' : 'Out of stock'}</span>
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 flex flex-col flex-grow min-w-0">
            <div className="mb-1">
              <h3 className="font-bold text-base sm:text-lg text-gray-900">{displayName}</h3>
              <div className="mt-1">
                {unitPrice === null ? (
                  <span className="text-sm text-gray-500">{language === 'ar' ? 'اختر النوع لعرض السعر' : 'Select option to see price'}</span>
                ) : discountPct > 0 ? (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-primary-600">${(unitPrice * (1 - discountPct / 100)).toFixed(2)}</span>
                    <span className="text-sm text-gray-400 line-through">${unitPrice.toFixed(2)}</span>
                    {shouldShowUnit && <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{safeT(t, `unit_${item.unit}`, item.unit!)}</span>}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-primary-600">${unitPrice.toFixed(2)}</span>
                    {shouldShowUnit && <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{safeT(t, `unit_${item.unit}`, item.unit!)}</span>}
                  </div>
                )}
              </div>
            </div>
            {displayDesc && <p className="text-gray-600 text-sm mb-3 line-clamp-3">{displayDesc}</p>}

            <div className="mt-auto space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {item.options && item.options.length > 0 && (
                <div className="space-y-2">
                  {item.options.map((opt) => (
                    <div key={opt.name} className="text-xs">
                      <span className="font-medium text-gray-700 block mb-1">
                        {language === 'ar' && opt.name_ar ? opt.name_ar : safeT(t, `option_${opt.name.toLowerCase().replace(/ /g, '_')}`, opt.name)}:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {opt.choices.map((choice, ci) => (
                          <button
                            key={choice}
                            onClick={(e) => { e.stopPropagation(); handleOptionChange(opt.name, choice); }}
                            className={`px-2 py-1 rounded border transition-colors ${
                              pendingOptions[opt.name] === choice
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            {language === 'ar' && opt.choices_ar?.[ci] ? opt.choices_ar[ci] : safeT(t, `choice_${choice.toLowerCase().replace(/[\s-]/g, '_')}`, choice)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); togglePreset(preset); }}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        pendingInstructions.includes(preset.en)
                          ? 'bg-primary-100 text-primary-700 border-primary-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {language === 'ar' ? preset.ar : preset.en}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder={t('special_instructions')}
                  value={pendingInstructions}
                  onChange={(e) => setPendingInstructions(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs p-2 border border-primary-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent outline-none resize-none bg-white placeholder:text-gray-400"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1">
                  <QuantitySelector
                    quantity={pendingQuantity}
                    onIncrease={() => setPendingQuantity(round(pendingQuantity + step))}
                    onDecrease={() => {
                      if (pendingQuantity - step >= minQuantity - 0.001) {
                        setPendingQuantity(round(pendingQuantity - step));
                      }
                    }}
                    onChange={(val) => setPendingQuantity(round(val))}
                    min={minQuantity}
                    step={step}
                  />
                </div>
                {previewTotal !== null && (
                  <div className="text-right pr-1 min-w-[88px]">
                    <p className="text-[11px] text-gray-500">{t('total')}</p>
                    <p className="text-sm font-bold text-primary-700">${previewTotal.toFixed(2)}</p>
                  </div>
                )}
                <Button
                  onClick={handleAddToCart}
                  className="shrink-0 flex items-center justify-center gap-2 px-4"
                  aria-label={t('add')}
                  disabled={discountedUnitPrice === null || !inStock}
                >
                  <PlusIcon className="h-5 w-5" />
                  {t('add')}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── COLLAPSED layout ── */}
      {!expanded && (
        <>
          {/* Image — left in LTR, right in RTL */}
          <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-200">
            <img src={imageUrl} alt={displayName} className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            {!inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                <span className="bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{language === 'ar' ? 'غير متوفر' : 'Out of stock'}</span>
              </div>
            )}
            {inStock && totalQuantity > 0 && (
              <div className="absolute top-1.5 start-1.5 bg-primary-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md animate-in zoom-in">
                {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2).replace(/\.?0+$/, '')}
                {shouldShowUnit && ` ${safeT(t, `unit_${item.unit}`, item.unit!)}`}
              </div>
            )}
            {inStock && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleQuickAdd(); }}
                className="absolute end-2 bottom-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-500 text-white shadow-md flex items-center justify-center text-lg font-bold leading-none hover:bg-primary-600 transition-colors"
                aria-label={t('add')}
              >
                +
              </button>
            )}
          </div>

          {/* Content — right in LTR, left in RTL */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 leading-snug">{displayName}</h3>
              {displayDesc && (
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{displayDesc}</p>
              )}
            </div>
            <div>
              {unitPrice === null ? (
                <span className="text-xs text-gray-400">{language === 'ar' ? 'اختر النوع لعرض السعر' : 'Select option to see price'}</span>
              ) : discountPct > 0 ? (
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-bold text-sm sm:text-base text-gray-900">${discountedUnitPrice!.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 line-through">${unitPrice.toFixed(2)}</span>
                </div>
              ) : (
                <span className="font-bold text-sm sm:text-base text-gray-900">${unitPrice.toFixed(2)}</span>
              )}
              {shouldShowUnit && (
                <span className="inline-block text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 mt-1">
                  {safeT(t, `unit_${item.unit}`, item.unit!)}
                </span>
              )}
              {totalQuantity > 0 && quickAddEnabled && (
                <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={handleQuickDecrease} className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 font-bold hover:bg-gray-50 transition-colors">−</button>
                  <span className="text-sm font-semibold text-gray-700 min-w-[1.5rem] text-center">
                    {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2).replace(/\.?0+$/, '')}
                  </span>
                  <button type="button" onClick={handleQuickAdd} className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold hover:bg-primary-600 transition-colors">+</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export const MenuCard = memo(MenuCardComponent);
