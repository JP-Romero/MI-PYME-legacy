/**
 * MI PYME — Raíz de la aplicación: navegación inferior táctil (pill),
 * modo claro/oscuro y enrutado simple por estado (sin router para el MVP).
 */
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './hooks/useApp';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import Pos from './pages/Pos';
import Inventory from './pages/Inventory';
import Cash from './pages/Cash';
import Reports from './pages/Reports';

type Tab = 'pos' | 'inventario' | 'caja' | 'reportes';

function Shell() {
  const { user, business, role } = useApp();
  const [tab, setTab] = useState<Tab>('pos');
  const [dark, setDark] = useState(true);

  // Modo oscuro Spatial Canvas por defecto
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  if (!user || !business) return <Login />; // sin sesión o sin tenant -> flujo de acceso/creación

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'pos', label: '🛒 POS', show: true },
    { id: 'inventario', label: '📦 Inventario', show: true },
    { id: 'caja', label: '💰 Caja', show: true },
    { id: 'reportes', label: '📊 Reportes', show: role === 'admin' }, // rol: vendedor sin métricas
  ];

  return (
    <div className="min-h-full">
      <TopBar />
      {tab === 'pos' && <Pos />}
      {tab === 'inventario' && <Inventory />}
      {tab === 'caja' && <Cash />}
      {tab === 'reportes' && <Reports />}

      {/* Navegación inferior tipo píldora flotante (VisionOS) */}
      <nav className="glass-panel fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-pill p-1.5">
        {tabs.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-pill px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
              tab === t.id ? 'bg-mint text-carbon shadow-glow' : 'dark:text-white'}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setDark(d => !d)} className="rounded-pill px-3 py-2 text-sm dark:text-white" title="Claro/Oscuro">
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
