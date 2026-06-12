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
  const unitLabel = item.unit && item.unit !== 'piece' ? item.unit : null;

  const displayName = language === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name);

  return (
    <div className="py-3 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {item.image && (
          <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
            <img src={item.image} alt={displayName} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 text-sm leading-snug">{displayName}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeItem(item.instanceId)}
              className="text-gray-300 hover:text-red-500 p-1 -me-1 shrink-0"
              aria-label="Remove item"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>

          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {Object.entries(item.selectedOptions).map(([key, value]) => (
                <p key={key} className="text-xs text-gray-400">
                  {key}: {value}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <QuantitySelector
                quantity={item.quantity}
                onDecrease={() => updateQuantity(item.instanceId, round(item.quantity - step))}
                onIncrease={() => updateQuantity(item.instanceId, round(item.quantity + step))}
                onChange={(val) => updateQuantity(item.instanceId, round(val))}
                min={minQuantity}
                step={step}
                size="sm"
              />
              {unitLabel && <span className="text-xs text-gray-400 font-medium">{unitLabel}</span>}
            </div>
            <div className="text-end">
              <p className="text-sm font-semibold text-primary-600">${(item.price * item.quantity).toFixed(2)}</p>
              {unitLabel && <p className="text-[11px] text-gray-400">${item.price.toFixed(2)}/{unitLabel}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <textarea
          placeholder={t('special_instructions')}
          value={item.instructions || ''}
          onChange={(e) => updateInstructions(item.instanceId, e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none bg-gray-50 placeholder:text-gray-400"
          rows={2}
        />
      </div>
    </div>
  );
};
