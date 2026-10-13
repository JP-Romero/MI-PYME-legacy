/** Barra superior claymórfica: negocio activo, selector multitienda, estado red y rol. */
import { useState } from 'react';
import { useApp } from '../hooks/useApp';

export default function TopBar() {
  const { business, businesses, role, online, switchBusiness, signOut } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass-panel flex items-center gap-3 px-4 py-3">
        {/* Selector de tienda (multitienda) */}
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-pill px-3 py-2 shadow-clay-inset active:scale-95 transition-transform">
          <span className="h-8 w-8 rounded-full bg-orchid text-white grid place-items-center font-black">{business?.name?.[0] ?? 'M'}</span>
          <span className="font-bold text-sm max-w-[140px] truncate dark:text-white">
            {business?.name ?? 'MI PYME'}
          </span>
          <span className="text-xs opacity-60 dark:text-white">▾</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Indicador de sincronización offline-first */}
          <span className={`chip ${online ? 'bg-mint/20 text-carbon dark:text-mint' : 'bg-amber/20 text-carbon dark:text-amber'}`}>
            {online ? '● En línea' : '○ Offline · guardando local'}
          </span>
          <span className={`chip ${role === 'admin' ? 'bg-orchid text-white' : 'bg-canvas-light dark:bg-white/10 dark:text-white'}`}>
            {role === 'admin' ? '👑 Admin' : '🧾 Vendedor'}
          </span>
          <button onClick={signOut} className="chip bg-coral text-white">Salir</button>
        </div>
      </div>

      {open && businesses.length > 0 && (
        <nav className="clay-card mt-2 absolute left-4 right-4 z-50">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide opacity-50 dark:text-white">Mis tiendas</p>
          {businesses.map(b => (
            <button key={b.id}
              onClick={() => { switchBusiness(b); setOpen(false); }}
              className={`w-full text-left rounded-pill px-4 py-3 mb-2 font-semibold dark:text-white ${b.id === business?.id ? 'bg-mint text-carbon' : 'shadow-clay-inset'}`}>
              {b.name} <span className="opacity-60 text-xs">· {b.industry}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
