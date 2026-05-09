import { useEffect, useMemo, useState } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid';
import { Button } from './Button';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onChange?: (value: number) => void;
  min?: number;
  step?: number;
  size?: 'sm' | 'md';
}

export const QuantitySelector = ({
  quantity,
  onIncrease,
  onDecrease,
  onChange,
  min = 1,
  step = 1,
  size = 'md',
}: QuantitySelectorProps) => {
  const [inputValue, setInputValue] = useState(quantity.toString());
  const [isEditing, setIsEditing] = useState(false);

  const decimalPlaces = useMemo(() => {
    const stepStr = step.toString();
    const dot = stepStr.indexOf('.');
    return dot === -1 ? 0 : stepStr.length - dot - 1;
  }, [step]);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(quantity.toString());
    }
  }, [quantity, isEditing]);

  const normalizeValue = (rawValue: string) => {
    const parsed = Number.parseFloat(rawValue.replace(',', '.'));
    if (Number.isNaN(parsed)) return quantity;

    const clamped = Math.max(min, parsed);
    const snapped = min + Math.round((clamped - min) / step) * step;
    return Number(snapped.toFixed(decimalPlaces));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRawValue = e.target.value;
    setInputValue(nextRawValue);

    if (!onChange) return;
    if (
      nextRawValue.trim() === '' ||
      nextRawValue === '-' ||
      nextRawValue === '.' ||
      nextRawValue === ',' ||
      nextRawValue === '-.' ||
      nextRawValue === '-,'
    ) {
      return;
    }

    const parsed = Number.parseFloat(nextRawValue.replace(',', '.'));
    if (Number.isNaN(parsed)) return;

    onChange(parsed);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (!onChange) {
      setInputValue(quantity.toString());
      return;
    }

    const next = normalizeValue(inputValue);
    onChange(next);
    setInputValue(next.toString());
  };

  return (
    <div className="flex items-center space-x-1">
      <Button
        type="button"
        variant="secondary"
        size={size === 'sm' ? 'sm' : 'md'}
        className={size === 'sm' ? 'p-1 h-7 w-7 flex items-center justify-center' : 'px-3 py-2 h-9 w-9 flex items-center justify-center'}
        onClick={onDecrease}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
      <input 
        type="number"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        min={min}
        step={step}
        className="w-16 text-center border-gray-200 rounded-md py-1 px-1 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
        aria-label="Quantity"
      />
      <Button
        type="button"
        variant="secondary"
        size={size === 'sm' ? 'sm' : 'md'}
        className={size === 'sm' ? 'p-1' : 'px-3 py-2'}
        onClick={onIncrease}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
