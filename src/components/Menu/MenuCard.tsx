import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button } from '../UI/Button';
import { QuantitySelector } from '../UI/QuantitySelector';

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
}

interface MenuCardProps {
  item: MenuItem;
}

export const MenuCard = ({ item }: MenuCardProps) => {
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  const cartInstances = cartItems.filter((i) => i.id === item.id);
  const totalQuantity = cartInstances.reduce((acc, i) => {
    // For weight items (step < 1), count instances?
    // User said "show 1 as quantity" for badge.
    // Here on the card, we want to show meaningful "You have X".
    // If weight based, summing weight is fine (e.g. 1.5 kg).
    // If piece based, summing count is fine.
    return acc + i.quantity;
  }, 0);

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
      name: `${item.name_en} - ${item.name_ar}`,
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
    const current = pendingInstructions;
    let newInstructions = current;
    if (current.includes(preset)) {
      newInstructions = current.replace(preset, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
    } else {
      newInstructions = current ? `${current}, ${preset}` : preset;
    }
    setPendingInstructions(newInstructions);
  };

  const presets = ["Extra fresh", "For BBQ", "Vacuum packed"];
  const imageUrl = item.image || `https://placehold.co/400x300?text=${encodeURIComponent(item.name_en)}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={imageUrl}
          alt={item.name_en}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {totalQuantity > 0 && (
          <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-in zoom-in">
            {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2).replace(/\.?0+$/, '')} {item.unit || 'in cart'}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-bold text-lg text-gray-900">{item.name_en}</h3>
          <span className="font-bold text-primary-600 shrink-0">
            ${item.price.toFixed(2)}
            {item.unit && <span className="text-sm text-gray-500 font-normal"> / {item.unit}</span>}
          </span>
        </div>
        <p className="text-gray-500 text-sm mb-1 font-arabic text-right" dir="rtl">{item.name_ar}</p>
        
        {item.description_en && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description_en}</p>
        )}

        <div className="mt-auto space-y-3">
          {item.options && item.options.length > 0 && (
            <div className="space-y-2">
              {item.options.map((opt) => (
                <div key={opt.name} className="text-xs">
                  <span className="font-medium text-gray-700 block mb-1">{opt.name}:</span>
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
                        {choice}
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
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Special instructions..."
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
              min={minQuantity}
            />
            <Button 
              onClick={handleAddToCart} 
              className="flex-1 flex items-center justify-center gap-2"
              aria-label="Add to cart"
            >
              <PlusIcon className="h-5 w-5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
