import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const FORCE_CLOSED_KEY = 'parisienne_force_closed';

interface StoreConfig {
  open_time: string;
  close_time: string;
  closed_days: number[];
  whatsapp_number: string;
  discount_percentage: number;
}

interface StoreConfigStore extends StoreConfig {
  force_closed: boolean;
  loading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<StoreConfig>) => Promise<void>;
  setForceClosed: (val: boolean) => void;
  isOpen: () => boolean;
}

export const useStoreConfigStore = create<StoreConfigStore>((set, get) => ({
  open_time: '08:00',
  close_time: '23:00',
  closed_days: [],
  whatsapp_number: '9613502022',
  discount_percentage: 0,
  force_closed: localStorage.getItem(FORCE_CLOSED_KEY) === 'true',
  loading: true,

  fetchConfig: async () => {
    const { data, error } = await supabase.from('store_config').select('*').eq('id', 1).single();
    if (!error && data) {
      set({
        open_time: data.open_time,
        close_time: data.close_time,
        closed_days: data.closed_days ?? [],
        whatsapp_number: data.whatsapp_number ?? '9613502022',
        discount_percentage: data.discount_percentage ?? 0,
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

  setForceClosed: (val: boolean) => {
    localStorage.setItem(FORCE_CLOSED_KEY, val ? 'true' : 'false');
    set({ force_closed: val });
  },

  isOpen: () => {
    const { open_time, close_time, closed_days, force_closed } = get();
    if (force_closed) return false;
    const now = new Date();
    const day = now.getDay();
    if (closed_days.includes(day)) return false;
    const [oh, om] = open_time.split(':').map(Number);
    const [ch, cm] = close_time.split(':').map(Number);
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  },
}));
