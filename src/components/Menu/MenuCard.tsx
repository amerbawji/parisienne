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
  expanded: boolean;
  onToggle: () => void;
}

const safeT = (t: (key: TranslationKey) => string, key: string, fallback: string) => {
  const translated = t(key as TranslationKey);
  if (translated === key) return fallback;
  return translated;
};

export const MenuCard = ({ item, expanded, onToggle }: MenuCardProps) => {
  const { language, t } = useLanguageStore();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  const cartInstances = cartItems.filter((i) => i.id === item.id);
  const totalQuantity = cartInstances.reduce((acc, i) => acc + i.quantity, 0);

  const [pendingOptions, setPendingOptions] = useState<Record<string, string>>({});
  
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

  const togglePreset = (preset: string) => {
    const current = pendingInstructions;
    let newInstructions = current;
    
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
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex transition-shadow group ${expanded ? 'flex-col' : 'flex-row h-full hover:shadow-md cursor-pointer'}`}
      onClick={() => !expanded && onToggle()}
    >
      {/* Image Side */}
      <div className={`relative bg-gray-200 shrink-0 ${expanded ? 'w-full h-64' : 'w-32 sm:w-48'}`}>
        <img
          src={imageUrl}
          alt={displayName}
          className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {totalQuantity > 0 && (
          <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-in zoom-in">
             {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2).replace(/\.?0+$/, '')} {item.unit ? safeT(t, `unit_${item.unit}`, item.unit) : t('in_cart')}
          </div>
        )}
      </div>

      {/* Content Side */}
      <div className="p-4 flex flex-col flex-grow min-w-0">
        <div className="mb-1">
          <h3 className="font-bold text-lg text-gray-900 break-words whitespace-normal">{displayName}</h3>
          <div className="mt-1">
            <span className="font-bold text-primary-600">
              ${item.price.toFixed(2)}
              {item.unit && <span className="text-sm text-gray-500 font-normal"> / {safeT(t, `unit_${item.unit}`, item.unit)}</span>}
            </span>
          </div>
        </div>
        
        {displayDesc && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{displayDesc}</p>
        )}

        {expanded ? (
          <div className="mt-auto space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {item.options && item.options.length > 0 && (
              <div className="space-y-2">
                {item.options.map((opt) => (
                  <div key={opt.name} className="text-xs">
                    <span className="font-medium text-gray-700 block mb-1">{safeT(t, `option_${opt.name.toLowerCase().replace(/ /g, '_')}`, opt.name)}:</span>
                    <div className="flex flex-wrap gap-1">
                      {opt.choices.map((choice) => (
                        <button
                          key={choice}
                          onClick={(e) => { e.stopPropagation(); handleOptionChange(opt.name, choice); }}
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
                    onClick={(e) => { e.stopPropagation(); togglePreset(preset); }}
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
              <Button 
                onClick={handleAddToCart} 
                className="shrink-0 flex items-center justify-center gap-2 px-4"
                aria-label={t('add')}
              >
                <PlusIcon className="h-5 w-5" />
                {t('add')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-auto">
             <span className="text-xs text-primary-600 font-medium underline">
               {t('add') || 'Customize & Add'}
             </span>
          </div>
        )}
      </div>
    </div>
  );
};
