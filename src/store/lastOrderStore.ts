import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './cartStore';

interface LastOrderState {
  items: CartItem[];
  savedAt: string | null;
  phone: string | null;
  orderNumber: number | null;
  saveOrder: (items: CartItem[], phone?: string, orderNumber?: number | null) => void;
  clearLastOrder: () => void;
}

export const useLastOrderStore = create<LastOrderState>()(
  persist(
    (set) => ({
      items: [],
      savedAt: null,
      phone: null,
      orderNumber: null,
      saveOrder: (items, phone, orderNumber) =>
        set({ items, savedAt: new Date().toISOString(), phone: phone ?? null, orderNumber: orderNumber ?? null }),
      clearLastOrder: () => set({ items: [], savedAt: null, phone: null, orderNumber: null }),
    }),
    { name: 'last-order-storage' }
  )
);
