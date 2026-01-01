import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  instanceId: string;
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  price: number;
  quantity: number;
  instructions: string;
  selectedOptions?: Record<string, string>;
  step?: number;
  minQuantity?: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  toggleCart: () => void;
  setCartOpen: (isOpen: boolean) => void;
  addItem: (item: { 
    id: string; 
    name: string;
    name_en?: string;
    name_ar?: string; 
    price: number; 
    selectedOptions?: Record<string, string>;
    quantity?: number;
    step?: number;
    minQuantity?: number;
    instructions?: string;
  }) => void;
  removeItem: (instanceId: string) => void;
  updateQuantity: (instanceId: string, quantity: number) => void;
  updateInstructions: (instanceId: string, instructions: string) => void;
  updateOptions: (instanceId: string, options: Record<string, string>) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      addItem: (newItem) => {
        set((state) => {
          const instanceId = Math.random().toString(36).substring(7);
          const quantity = newItem.quantity || newItem.minQuantity || 1;
          return {
            items: [...state.items, { 
              ...newItem, 
              instanceId,
              quantity, 
              instructions: newItem.instructions || '', 
              selectedOptions: newItem.selectedOptions || {},
              step: newItem.step,
              minQuantity: newItem.minQuantity,
              name_en: newItem.name_en,
              name_ar: newItem.name_ar
            }],
          };
        });
      },
      updateOptions: (instanceId, options) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.instanceId === instanceId ? { ...item, selectedOptions: options } : item
          ),
        }));
      },
      removeItem: (instanceId) => {
        set((state) => ({
          items: state.items.filter((item) => item.instanceId !== instanceId),
        }));
      },
      updateQuantity: (instanceId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.instanceId === instanceId ? { ...item, quantity } : item
          ),
        }));
      },
      updateInstructions: (instanceId, instructions) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.instanceId === instanceId ? { ...item, instructions } : item
          ),
        }));
      },
      clearCart: () => {
        set({ items: [] });
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => {
          if (item.step && item.step < 1) {
            return total + 1;
          }
          return total + item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
