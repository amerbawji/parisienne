import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid';
import { Button } from './Button';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  size?: 'sm' | 'md';
}

export const QuantitySelector = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  size = 'md',
}: QuantitySelectorProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant="secondary"
        size={size === 'sm' ? 'sm' : 'md'}
        className={size === 'sm' ? 'p-1' : 'px-3 py-2'}
        onClick={onDecrease}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
      <span className="min-w-[2rem] px-1 text-center font-medium">
        {Number.isInteger(quantity) ? quantity : quantity.toFixed(2).replace(/\.?0+$/, '')}
      </span>
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
