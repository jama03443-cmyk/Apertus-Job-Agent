import { supabase } from './supabase';

export function signInWithGoogle(destination: string) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${destination}` },
  });
}
