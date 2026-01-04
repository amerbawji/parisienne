import { useCartStore, type CartItem } from '../../store/cartStore';
import { useLanguageStore } from '../../store/languageStore';
import { QuantitySelector } from '../UI/QuantitySelector';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../UI/Button';

interface CartItemRowProps {
  item: CartItem;
}

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const { updateQuantity, updateInstructions, removeItem } = useCartStore();
  const { language, t } = useLanguageStore();
  const step = item.step || 1;
  const minQuantity = item.minQuantity || 1;
  const round = (num: number) => Math.round(num * 100) / 100;

  const displayName = language === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name);

  return (
    <div className="py-4 border-b border-gray-100 last:border-0 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <h4 className="font-medium text-gray-900 text-sm">{displayName}</h4>
          <p className="text-sm text-primary-600 font-medium mt-1">${(item.price * item.quantity).toFixed(2)}</p>
          
          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
             <div className="mt-1 space-y-0.5">
               {Object.entries(item.selectedOptions).map(([key, value]) => (
                 <p key={key} className="text-xs text-gray-500">
                   {key}: {value}
                 </p>
               ))}
             </div>
          )}
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeItem(item.instanceId)}
            className="text-gray-400 hover:text-red-500 p-1 -mr-1"
            aria-label="Remove item"
        >
          <TrashIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center mt-3">
        <QuantitySelector
          quantity={item.quantity}
          onDecrease={() => updateQuantity(item.instanceId, round(item.quantity - step))}
          onIncrease={() => updateQuantity(item.instanceId, round(item.quantity + step))}
          onChange={(val) => updateQuantity(item.instanceId, round(val))}
          min={minQuantity}
          step={step}
          size="sm"
        />
      </div>

      <div className="mt-3">
        <label htmlFor={`instructions-${item.instanceId}`} className="sr-only">{t('special_instructions')}</label>
        <textarea
          id={`instructions-${item.instanceId}`}
          placeholder={t('special_instructions')}
          value={item.instructions || ''}
          onChange={(e) => updateInstructions(item.instanceId, e.target.value)}
          className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none bg-gray-50 placeholder:text-gray-400"
          rows={2}
        />
      </div>
    </div>
  );
};
