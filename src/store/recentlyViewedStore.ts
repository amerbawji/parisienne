import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentlyViewedItem {
  id: string;
  name_en: string;
  name_ar: string;
  image?: string;
  price: number;
  categoryId: string;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  addItem: (item: RecentlyViewedItem) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const filtered = get().items.filter((i) => i.id !== item.id);
        set({ items: [item, ...filtered].slice(0, 8) });
      },
      clear: () => set({ items: [] }),
    }),
    { name: 'recently-viewed-storage' }
  )
);
