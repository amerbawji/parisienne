import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  instanceId: string;
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  image?: string;
  price: number;
  quantity: number;
  instructions: string;
  selectedOptions?: Record<string, string>;
  selectedOptionsAr?: Record<string, string>;
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
    image?: string;
    price: number;
    selectedOptions?: Record<string, string>;
    selectedOptionsAr?: Record<string, string>;
    quantity?: number;
    step?: number;
    minQuantity?: number;
    instructions?: string;
  }) => string;
  removeItem: (instanceId: string) => void;
  updateQuantity: (instanceId: string, quantity: number) => void;
  updateInstructions: (instanceId: string, instructions: string) => void;
  updateOptions: (instanceId: string, options: Record<string, string>) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      addItem: (newItem) => {
        const instanceId = Math.random().toString(36).substring(7);
        set((state) => {
          const quantity = newItem.quantity || newItem.minQuantity || 1;
          return {
            items: [...state.items, { 
              ...newItem,
              instanceId,
              quantity,
              instructions: newItem.instructions || '',
              selectedOptions: newItem.selectedOptions || {},
              selectedOptionsAr: newItem.selectedOptionsAr,
              step: newItem.step,
              minQuantity: newItem.minQuantity,
              name_en: newItem.name_en,
              name_ar: newItem.name_ar,
              image: newItem.image
            }],
          };
        });
        return instanceId;
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
          return total + (item.step && item.step < 1 ? 1 : item.quantity);
        }, 0);
      },
      getSubtotal: () =>
        get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
