import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './cartStore';

interface LastOrderState {
  items: CartItem[];
  savedAt: string | null;
  saveOrder: (items: CartItem[]) => void;
  clearLastOrder: () => void;
}

export const useLastOrderStore = create<LastOrderState>()(
  persist(
    (set) => ({
      items: [],
      savedAt: null,
      saveOrder: (items) => set({ items, savedAt: new Date().toISOString() }),
      clearLastOrder: () => set({ items: [], savedAt: null }),
    }),
    { name: 'last-order-storage' }
  )
);
