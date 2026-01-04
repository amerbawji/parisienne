import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button } from '../UI/Button';
import { QuantitySelector } from '../UI/QuantitySelector';
import { type TranslationKey } from '../../data/translations';

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
  options?: { name: string; choices: string[] }[];
  presets?: string[];
}

interface MenuCardProps {
  item: MenuItem;
}

const safeT = (t: (key: TranslationKey) => string, key: string, fallback: string) => {
  // A helper to try translating a constructed key, falling back to original text if translation key doesn't exist
  // Since our t() implementation returns the key if missing, we need to check if the returned value is different from key
  // BUT: if the key is "Fat", and translation is missing, it returns "Fat".
  // If we pass "option_fat", and missing, it returns "option_fat".
  // So we check if result starts with "option_" or "choice_" or "preset_" (assuming we construct keys that way)
  // This is a bit hacky but works for now without complex existence checks.
  const translated = t(key as TranslationKey);
  if (translated === key) return fallback;
  return translated;
};

export const MenuCard = ({ item }: MenuCardProps) => {
  const { language, t } = useLanguageStore();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  const cartInstances = cartItems.filter((i) => i.id === item.id);
  const totalQuantity = cartInstances.reduce((acc, i) => acc + i.quantity, 0);

  const [pendingOptions, setPendingOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    if (item.options) {
      item.options.forEach(opt => {
        defaults[opt.name] = opt.choices[0];
      });
    }
    return defaults;
  });
  
  const step = item.weight_step || 1;
  const minQuantity = item.min_quantity || 1;
  const round = (num: number) => Math.round(num * 100) / 100;

  const [pendingInstructions, setPendingInstructions] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState(minQuantity);

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: language === 'ar' ? item.name_ar : item.name_en, // Current display name
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: item.price,
      selectedOptions: pendingOptions,
      instructions: pendingInstructions,
      step,
      minQuantity,
      quantity: pendingQuantity,
    });
    setPendingInstructions('');
    setPendingQuantity(minQuantity);
  };

  const handleOptionChange = (optionName: string, choice: string) => {
    setPendingOptions(prev => ({ ...prev, [optionName]: choice }));
  };

  const togglePreset = (preset: string) => {
    // We toggle the ENGLISH preset name in the state, but display translated
    // Or we should handle localization in the logic.
    // For simplicity, let's keep logic using English strings (so duplicates don't happen across langs)
    // but display translated.
    const current = pendingInstructions;
    let newInstructions = current;
    
    // Note: If user switches lang, the existing instructions might be in mixed langs if we appended translated text.
    // But here we're appending the preset string itself (which is English from the array).
    // So logic holds.
    if (current.includes(preset)) {
      newInstructions = current.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
    } else {
      newInstructions = current ? `${current}, ${preset}` : preset;
    }
    setPendingInstructions(newInstructions);
  };

  const presets = item.presets || [];
  const imageUrl = item.image || `https://placehold.co/400x300?text=${encodeURIComponent(item.name_en)}`;
  
  const displayName = language === 'ar' ? item.name_ar : item.name_en;
  const displayDesc = language === 'ar' ? item.description_ar : item.description_en;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={imageUrl}
          alt={displayName}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {totalQuantity > 0 && (
          <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-in zoom-in">
             {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2).replace(/\.?0+$/, '')} {item.unit ? safeT(t, `unit_${item.unit}`, item.unit) : t('in_cart')}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-bold text-lg text-gray-900">{displayName}</h3>
          <span className="font-bold text-primary-600 shrink-0">
            ${item.price.toFixed(2)}
            {item.unit && <span className="text-sm text-gray-500 font-normal"> / {safeT(t, `unit_${item.unit}`, item.unit)}</span>}
          </span>
        </div>
        
        {displayDesc && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{displayDesc}</p>
        )}

        <div className="mt-auto space-y-3">
          {item.options && item.options.length > 0 && (
            <div className="space-y-2">
              {item.options.map((opt) => (
                <div key={opt.name} className="text-xs">
                  <span className="font-medium text-gray-700 block mb-1">{safeT(t, `option_${opt.name.toLowerCase().replace(/ /g, '_')}`, opt.name)}:</span>
                  <div className="flex flex-wrap gap-1">
                    {opt.choices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => handleOptionChange(opt.name, choice)}
                        className={`px-2 py-1 rounded border transition-colors ${
                          pendingOptions[opt.name] === choice
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {safeT(t, `choice_${choice.toLowerCase().replace(/[\s-]/g, '_')}`, choice)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => togglePreset(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    pendingInstructions.includes(preset)
                      ? 'bg-primary-100 text-primary-700 border-primary-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {safeT(t, `preset_${preset.toLowerCase().replace(/ /g, '_')}`, preset)}
                </button>
              ))}
            </div>
            <textarea
              placeholder={t('special_instructions')}
              value={pendingInstructions}
              onChange={(e) => setPendingInstructions(e.target.value)}
              className="w-full text-xs p-2 border border-primary-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-transparent outline-none resize-none bg-white placeholder:text-gray-400"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
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
            <Button 
              onClick={handleAddToCart} 
              className="flex-1 flex items-center justify-center gap-2"
              aria-label={t('add')}
            >
              <PlusIcon className="h-5 w-5" />
              {t('add')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
