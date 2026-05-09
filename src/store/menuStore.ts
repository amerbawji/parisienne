import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface MenuOption {
  id?: string;
  name: string;
  choices: string[];
  price_additions?: Record<string, number>;
}

export interface MenuItem {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  unit: string;
  weight_step?: number;
  min_quantity?: number;
  description_en?: string;
  description_ar?: string;
  image?: string;
  options?: MenuOption[];
  presets?: string[];
  active?: boolean;
  in_stock?: boolean;
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  image: string;
  active: boolean;
  items: MenuItem[];
}

interface MenuStore {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchMenu: () => Promise<void>;
  addCategory: (cat: Omit<Category, 'items'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'items'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addItem: (categoryId: string, item: MenuItem) => Promise<void>;
  updateItem: (categoryId: string, itemId: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteItem: (categoryId: string, itemId: string) => Promise<void>;
  reorderCategory: (id: string, direction: 'up' | 'down') => Promise<void>;
  reorderItem: (categoryId: string, itemId: string, direction: 'up' | 'down') => Promise<void>;
}

type CatRow = { id: string; name_en: string; name_ar: string; image_url: string; active: boolean; sort_order: number };
type ItemRow = { id: string; category_id: string; name_en: string; name_ar: string; price: number; unit: string; weight_step: number | null; min_quantity: number | null; description_en: string; description_ar: string; image_url: string; presets: string[]; sort_order: number; active: boolean; in_stock: boolean };
type OptRow = { id: string; item_id: string; name: string; choices: string[]; price_additions: Record<string, number>; sort_order: number };

function rowsToCategories(cats: CatRow[], items: ItemRow[], opts: OptRow[]): Category[] {
  return cats
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => ({
      id: cat.id,
      name_en: cat.name_en,
      name_ar: cat.name_ar,
      image: cat.image_url,
      active: cat.active,
      items: items
        .filter((i) => i.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          name_en: item.name_en,
          name_ar: item.name_ar,
          price: Number(item.price),
          unit: item.unit,
          weight_step: item.weight_step ?? undefined,
          min_quantity: item.min_quantity ?? undefined,
          description_en: item.description_en,
          description_ar: item.description_ar,
          image: item.image_url || undefined,
          presets: item.presets?.length ? item.presets : undefined,
          active: item.active,
          in_stock: item.in_stock,
          options: opts
            .filter((o) => o.item_id === item.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((o) => ({ id: o.id, name: o.name, choices: o.choices, price_additions: o.price_additions })),
        })),
    }));
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchMenu: async () => {
    set({ loading: true, error: null });
    const [{ data: cats, error: e1 }, { data: items, error: e2 }, { data: opts, error: e3 }] =
      await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('items').select('*'),
        supabase.from('item_options').select('*'),
      ]);
    if (e1 || e2 || e3) {
      set({ loading: false, error: (e1 ?? e2 ?? e3)!.message });
      return;
    }
    set({ categories: rowsToCategories(cats!, items!, opts!), loading: false });
  },

  addCategory: async (cat) => {
    const sort_order = get().categories.length;
    const { error } = await supabase.from('categories').insert({
      id: cat.id, name_en: cat.name_en, name_ar: cat.name_ar, image_url: cat.image, active: true, sort_order,
    });
    if (error) throw error;
    set((s) => ({ categories: [...s.categories, { ...cat, items: [] }] }));
  },

  updateCategory: async (id, updates) => {
    const { error } = await supabase.from('categories').update({
      ...(updates.name_en !== undefined && { name_en: updates.name_en }),
      ...(updates.name_ar !== undefined && { name_ar: updates.name_ar }),
      ...(updates.image   !== undefined && { image_url: updates.image }),
      ...(updates.active  !== undefined && { active: updates.active }),
    }).eq('id', id);
    if (error) throw error;
    set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, ...updates } : c) }));
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  addItem: async (categoryId, item) => {
    const sort_order = get().categories.find((c) => c.id === categoryId)?.items.length ?? 0;
    const { error: ie } = await supabase.from('items').insert({
      id: item.id, category_id: categoryId, name_en: item.name_en, name_ar: item.name_ar,
      price: item.price, unit: item.unit, weight_step: item.weight_step ?? null,
      min_quantity: item.min_quantity ?? null, description_en: item.description_en ?? '',
      description_ar: item.description_ar ?? '', image_url: item.image ?? '',
      presets: item.presets ?? [], sort_order, active: true, in_stock: true,
    });
    if (ie) throw ie;
    if (item.options?.length) {
      const { error: oe } = await supabase.from('item_options').insert(
        item.options.map((o, i) => ({ item_id: item.id, name: o.name, choices: o.choices, price_additions: o.price_additions ?? {}, sort_order: i }))
      );
      if (oe) throw oe;
    }
    set((s) => ({ categories: s.categories.map((c) => c.id === categoryId ? { ...c, items: [...c.items, item] } : c) }));
  },

  updateItem: async (categoryId, itemId, updates) => {
    const { options, image, ...rest } = updates;
    const { error: ie } = await supabase.from('items').update({
      ...(rest.name_en       !== undefined && { name_en: rest.name_en }),
      ...(rest.name_ar       !== undefined && { name_ar: rest.name_ar }),
      ...(rest.price         !== undefined && { price: rest.price }),
      ...(rest.unit          !== undefined && { unit: rest.unit }),
      ...('weight_step'   in rest && { weight_step: rest.weight_step ?? null }),
      ...('min_quantity'  in rest && { min_quantity: rest.min_quantity ?? null }),
      ...(rest.description_en !== undefined && { description_en: rest.description_en }),
      ...(rest.description_ar !== undefined && { description_ar: rest.description_ar }),
      ...(image              !== undefined && { image_url: image ?? '' }),
      ...(rest.presets       !== undefined && { presets: rest.presets }),
      ...(rest.active        !== undefined && { active: rest.active }),
      ...(rest.in_stock      !== undefined && { in_stock: rest.in_stock }),
    }).eq('id', itemId);
    if (ie) throw ie;
    if (options !== undefined) {
      await supabase.from('item_options').delete().eq('item_id', itemId);
      if (options.length) {
        const { error: oe } = await supabase.from('item_options').insert(
          options.map((o, i) => ({ item_id: itemId, name: o.name, choices: o.choices, price_additions: o.price_additions ?? {}, sort_order: i }))
        );
        if (oe) throw oe;
      }
    }
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.map((it) => it.id === itemId ? { ...it, ...updates } : it) } : c
      ),
    }));
  },

  deleteItem: async (categoryId, itemId) => {
    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) throw error;
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      ),
    }));
  },

  reorderCategory: async (id, direction) => {
    const cats = [...get().categories];
    const idx = cats.findIndex((c) => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return;
    [cats[idx], cats[swapIdx]] = [cats[swapIdx], cats[idx]];
    await Promise.all([
      supabase.from('categories').update({ sort_order: idx }).eq('id', cats[idx].id),
      supabase.from('categories').update({ sort_order: swapIdx }).eq('id', cats[swapIdx].id),
    ]);
    set({ categories: cats });
  },

  reorderItem: async (categoryId, itemId, direction) => {
    const cats = get().categories;
    const cat = cats.find((c) => c.id === categoryId);
    if (!cat) return;
    const items = [...cat.items];
    const idx = items.findIndex((i) => i.id === itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    await Promise.all([
      supabase.from('items').update({ sort_order: idx }).eq('id', items[idx].id),
      supabase.from('items').update({ sort_order: swapIdx }).eq('id', items[swapIdx].id),
    ]);
    set((s) => ({
      categories: s.categories.map((c) => c.id === categoryId ? { ...c, items } : c),
    }));
  },
}));
