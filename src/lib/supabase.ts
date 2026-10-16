import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A throwaway client for creating team accounts, so signing up a new user
// doesn't replace the signed-in admin's session.
export function createSignUpClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'parisienne-signup' },
  });
}

export const IMAGES_BUCKET = 'menu-images';

export async function uploadImage(file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
