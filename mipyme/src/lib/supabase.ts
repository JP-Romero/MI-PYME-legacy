/**
 * MI PYME — Cliente Supabase
 * Variables de entorno requeridas (archivo .env):
 *   VITE_SUPABASE_URL       -> https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  -> clave pública (anon)
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // En desarrollo sin credenciales la app funciona en modo demo local.
  console.warn('[MI PYME] Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: modo offline-demo activo.');
}

export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,          // Sesión persistente para móvil
      autoRefreshToken: true,
      detectSessionInUrl: false,     // No es flujo OAuth web
    },
    global: {
      // Reintentos suaves para conexiones móviles inestables
      fetch: async (input, init) => {
        for (let i = 0; i < 3; i++) {
          try { return await fetch(input, init); }
          catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 600 * (i + 1))); }
        }
        throw new Error('unreachable');
      },
    },
  },
);
