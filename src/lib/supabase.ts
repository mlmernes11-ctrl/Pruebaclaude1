import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // React Native lacks a complete URL implementation, which supabase-js relies on.
  require('react-native-url-polyfill/auto');
}

// Project "gestion-alquileres" (São Paulo). The publishable key is meant to ship inside the app:
// access is enforced by Row Level Security, which only lets the allowlisted administrator in.
export const SUPABASE_URL = 'https://txuobaovrmdcecdkmrgd.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Lk7JJHh9TGYVlZ7ljm-2Tg_6tyLTR5f';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only the web build receives sign-in redirects in its URL (used later for Google sign-in).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
