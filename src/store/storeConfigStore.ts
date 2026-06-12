import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const FORCE_CLOSED_KEY = 'parisienne_force_closed';
const FORCE_OPEN_KEY   = 'parisienne_force_open';

interface StoreConfig {
  open_time: string;
  close_time: string;
  closed_days: number[];
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  discount_percentage: number;
  hide_items_without_image: boolean;
}

interface StoreConfigStore extends StoreConfig {
  force_closed: boolean;
  force_open: boolean;
  loading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<StoreConfig>) => Promise<void>;
  setForceState: (state: 'open' | 'closed' | 'auto') => void;
  isOpen: () => boolean;
}

export const useStoreConfigStore = create<StoreConfigStore>((set, get) => ({
  open_time: '08:00',
  close_time: '23:00',
  closed_days: [],
  whatsapp_number: '9613502022',
  whatsapp_enabled: true,
  discount_percentage: 0,
  hide_items_without_image: false,
  force_closed: localStorage.getItem(FORCE_CLOSED_KEY) === 'true',
  force_open:   localStorage.getItem(FORCE_OPEN_KEY)   === 'true',
  loading: true,

  fetchConfig: async () => {
    const { data, error } = await supabase.from('store_config').select('*').eq('id', 1).single();
    if (!error && data) {
      set({
        open_time: data.open_time,
        close_time: data.close_time,
        closed_days: data.closed_days ?? [],
        whatsapp_number: data.whatsapp_number ?? '9613502022',
        whatsapp_enabled: data.whatsapp_enabled ?? true,
        discount_percentage: data.discount_percentage ?? 0,
        hide_items_without_image: data.hide_items_without_image ?? false,
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  updateConfig: async (updates) => {
    const { error } = await supabase.from('store_config').update(updates).eq('id', 1);
    if (error) throw error;
    set(updates);
  },

  setForceState: (state) => {
    const force_open   = state === 'open';
    const force_closed = state === 'closed';
    localStorage.setItem(FORCE_OPEN_KEY,   force_open   ? 'true' : 'false');
    localStorage.setItem(FORCE_CLOSED_KEY, force_closed ? 'true' : 'false');
    set({ force_open, force_closed });
  },

  isOpen: () => {
    const { open_time, close_time, closed_days, force_open, force_closed } = get();
    if (force_open)   return true;
    if (force_closed) return false;
    const now = new Date();
    const day = now.getDay();
    if (closed_days.includes(day)) return false;
    const [oh, om] = open_time.split(':').map(Number);
    const [ch, cm] = close_time.split(':').map(Number);
    const openMinutes  = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    const nowMinutes   = now.getHours() * 60 + now.getMinutes();
    // Midnight-crossing hours (e.g. 20:00 – 02:00)
    if (closeMinutes <= openMinutes) {
      return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
    }
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  },
}));
