import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface PromoStore {
  enabled: boolean;
  image: string;
  loading: boolean;
  fetchPromo: () => Promise<void>;
  setEnabled: (v: boolean) => Promise<void>;
  setImage: (img: string) => Promise<void>;
}

export const usePromoStore = create<PromoStore>((set) => ({
  enabled: true,
  image: '/promo-ramadan.jpg',
  loading: false,

  fetchPromo: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('promo_config').select('*').eq('id', 1).single();
    if (!error && data) set({ enabled: data.enabled, image: data.image_url });
    set({ loading: false });
  },

  setEnabled: async (v) => {
    set({ enabled: v });
    await supabase.from('promo_config').update({ enabled: v }).eq('id', 1);
  },

  setImage: async (img) => {
    set({ image: img });
    await supabase.from('promo_config').update({ image_url: img }).eq('id', 1);
  },
}));
