/**
 * MI PYME / ANTRA POS — Raíz de la aplicación.
 * Con navegación inferior flotante fija con 5 pestañas:
 * Vender, Catálogo, Ventas, Analítica, Gestión.
 */
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './hooks/useApp';
import Login from './pages/Login';
import Pos from './pages/Pos';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Gestion from './pages/Gestion';
import BottomNav, { type NavigationTab } from './components/BottomNav';
import { useCart } from './hooks/useCart';

function Shell() {
  const { user, business } = useApp();
  const [tab, setTab] = useState<NavigationTab>('vender');
  const [dark, setDark] = useState(false); // Modo claro fiel a la captura de pantalla por defecto
  const cartState = useCart();

  // Sincronización con el modo oscuro de Tailwind
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  if (!user || !business) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased">
      {/* Contenido de la pestaña activa */}
      <main className="w-full">
        {tab === 'vender' && (
          <Pos cartState={cartState} onOpenSettings={() => setTab('gestion')} />
        )}
        {tab === 'catalogo' && <Inventory />}
        {tab === 'ventas' && <Sales />}
        {tab === 'analitica' && <Reports />}
        {tab === 'gestion' && (
          <Gestion dark={dark} onToggleDark={() => setDark((d) => !d)} />
        )}
      </main>

      {/* Barra de navegación flotante con los 5 iconos */}
      <BottomNav currentTab={tab} onSelectTab={setTab} />
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
