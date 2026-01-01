import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import { CartItemRow } from './CartItemRow';
import { Button } from '../UI/Button';
import { generateWhatsAppLink } from '../../utils/whatsapp';
import { cn } from '../../utils/cn';

const OptionButton = ({ 
  selected, 
  onClick, 
  children 
}: { 
  selected: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200",
      selected 
        ? "bg-primary-500 text-white border-primary-500 shadow-sm" 
        : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:bg-primary-50"
    )}
  >
    {children}
  </button>
);

export const CartContent = () => {
  const { items, getTotalItems, clearCart, setCartOpen } = useCartStore();
  const navigate = useNavigate();
  const totalItems = getTotalItems();
  const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [serviceType, setServiceType] = useState<'takeaway' | 'delivery'>('takeaway');
  const [timing, setTiming] = useState<'now' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [error, setError] = useState('');

  const handleCheckout = () => {
    if (items.length === 0) return;

    if (timing === 'scheduled' && !scheduledTime) {
      setError('Please select a date and time for your order');
      return;
    }
    
    const details = {
      serviceType,
      timing,
      scheduledTime,
      paymentMethod
    };

    const link = generateWhatsAppLink(items, details);
    
    window.open(link, '_blank');
    clearCart();
    setCartOpen(false);
    navigate('/');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 text-center">Looks like you haven't added anything yet.</p>
        <Button onClick={() => setCartOpen(false)}>Start Ordering</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <div className="flex justify-end mb-2">
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to clear your cart?')) {
                clearCart();
              }
            }}
            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            Clear All
          </button>
        </div>

        <ul role="list" className="divide-y divide-gray-100 mb-6">
          {items.map((item) => (
            <li key={item.instanceId || item.id} className="py-4">
              <CartItemRow item={item} />
            </li>
          ))}
        </ul>

        {/* Order Options */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Service Type</label>
            <div className="flex gap-2">
              <OptionButton 
                selected={serviceType === 'takeaway'} 
                onClick={() => setServiceType('takeaway')}
              >
                🥡 Takeaway
              </OptionButton>
              <OptionButton 
                selected={serviceType === 'delivery'} 
                onClick={() => setServiceType('delivery')}
              >
                🛵 Delivery
              </OptionButton>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Timing</label>
            <div className="flex gap-2 mb-2">
              <OptionButton 
                selected={timing === 'now'} 
                onClick={() => {
                  setTiming('now');
                  setError('');
                }}
              >
                🕒 Now
              </OptionButton>
              <OptionButton 
                selected={timing === 'scheduled'} 
                onClick={() => setTiming('scheduled')}
              >
                📅 Schedule
              </OptionButton>
            </div>
            
            {timing === 'scheduled' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    setError('');
                  }}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
            <div className="flex gap-2">
              <OptionButton 
                selected={paymentMethod === 'cash'} 
                onClick={() => setPaymentMethod('cash')}
              >
                💵 Cash
              </OptionButton>
              <OptionButton 
                selected={paymentMethod === 'card'} 
                onClick={() => setPaymentMethod('card')}
              >
                💳 Card
              </OptionButton>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 border-t border-gray-100 mt-auto safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}
        
        <div className="flex justify-between text-base font-medium text-gray-500 mb-2">
          <span>Total Items</span>
          <span>{totalItems}</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-gray-900 mb-6">
          <span>Total Amount</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>

        <div className="mb-4 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Order Disclaimer:</span> Final weight and price may vary slightly
        </div>
        
        <Button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-2 py-4 text-lg shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-shadow"
        >
          Confirm Order via WhatsApp
        </Button>
      </div>
    </div>
  );
};
