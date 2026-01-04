import { useState } from 'react';
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
  const [prevQuantity, setPrevQuantity] = useState(quantity);

  // Sync state with props if prop changes externally
  if (quantity !== prevQuantity) {
    setPrevQuantity(quantity);
    setInputValue(quantity.toString());
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && onChange) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    // Ensure on blur we sync back to the actual quantity (handling empty or invalid input)
    setInputValue(quantity.toString());
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
        onBlur={handleBlur}
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
