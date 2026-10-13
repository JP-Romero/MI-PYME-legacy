/**
 * MI PYME — Contexto global: sesión, negocio activo (tenant), rol y conectividad.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Network } from '@capacitor/network';
import { supabase } from '../lib/supabase';
import { auth, listMyBusinesses, syncPending, pendingCount } from '../lib/api';
import { localStore, keys } from '../lib/offline';
import type { Business, Role } from '../lib/types';

interface AppCtx {
  user: User | null;
  business: Business | null;      // tenant activo
  role: Role;                     // admin | vendedor (en el negocio activo)
  businesses: Business[];         // negocios del usuario (multitienda)
  online: boolean;
  pendingSync: number;            // operaciones locales en cola (offline-first)
  signIn: (email: string, pass: string) => Promise<string | null>;
  signUp: (name: string, email: string, pass: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  switchBusiness: (b: Business) => Promise<void>;
  refreshPending: () => Promise<void>;
}

const Ctx = createContext<AppCtx>(null!);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  // Conectividad (offline-first): escucha eventos web + Capacitor Network
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const p = Network.addListener('networkStatusChange', s => setOnline(s.connected));
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); p.then(l => l.remove()); };
  }, []);

  /** Recuenta la cola local pendiente del tenant activo. */
  const refreshPending = async () => {
    if (!business) { setPendingSync(0); return; }
    setPendingSync(await pendingCount(business.id));
  };

  // Al recuperar conexión: sincronizar la cola offline del negocio activo
  useEffect(() => {
    if (!online || !business) return;
    let cancelled = false;
    (async () => {
      const done = await syncPending(business.id);
      if (cancelled) return;
      if (done > 0) {
        // refrescar catálogo para pintar datos ya sincronizados
        const list = user ? await listMyBusinesses(user.id) : [];
        if (!cancelled && list.length) setBusinesses(list);
      }
      await refreshPending();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, business?.id]);

  // Sesión inicial persistente
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && handleUser(data.session.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => handleUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUser(u: User | null) {
    setUser(u);
    if (!u) { setBusiness(null); setBusinesses([]); return; }
    const list = await listMyBusinesses(u.id);
    setBusinesses(list);
    // Restaurar último negocio activo desde almacenamiento local
    const last = await localStore.get<Business | null>(keys.sessionBusiness(u.id), null);
    const active = list.find(b => b.id === last?.id) ?? list[0] ?? null;
    if (active) setBusiness(active);
  }

  const value = useMemo<AppCtx>(() => ({
    user, business, businesses, online, pendingSync,
    role: ((business as Business & { _role?: Role })?._role) ?? 'vendedor',
    async signIn(email, pass) {
      const { error } = await auth.signIn(email, pass);
      return error?.message ?? null;
    },
    async signUp(name, email, pass) {
      const { error } = await auth.signUp(email, pass, name);
      return error?.message ?? null;
    },
    async signOut() {
      // Higiene multi-tenant: borrar caché/cola locales antes de salir
      if (business) {
        await localStore.remove(keys.productsCache(business.id));
        await localStore.remove(keys.categoriesCache(business.id));
        await localStore.remove(keys.syncQueue(business.id));
      }
      if (user) await localStore.remove(keys.sessionBusiness(user.id));
      await auth.signOut();
    },
    async switchBusiness(b) {
      setBusiness(b);
      if (user) await localStore.set(keys.sessionBusiness(user.id), b);
    },
    refreshPending,
  }), [user, business, businesses, online, pendingSync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
