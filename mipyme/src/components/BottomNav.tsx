/**
 * Barra de navegación flotante / fija inferior.
 * Con los 5 iconos requeridos: Vender, Catálogo, Ventas, Analítica, Gestión.
 */

export type NavigationTab = 'vender' | 'catalogo' | 'ventas' | 'analitica' | 'gestion';

interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export default function BottomNav({ currentTab, onSelectTab }: BottomNavProps) {
  const tabs: { id: NavigationTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
    {
      id: 'vender',
      label: 'Vender',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-transform ${active ? 'text-[#ea580c] scale-105' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Carrito de compras con ruedas circulares */}
          <circle cx="8" cy="20" r="1.75" />
          <circle cx="18" cy="20" r="1.75" />
          <path d="M2.5 3h3.2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.8a1.8 1.8 0 0 0 1.8-1.4l1.8-7.7H6.2" />
        </svg>
      ),
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-transform ${active ? 'text-[#ea580c] scale-105' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Caja isométrica / Paquete */}
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-transform ${active ? 'text-[#ea580c] scale-105' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Recibo / Factura / Ticket */}
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      id: 'analitica',
      label: 'Analítica',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-transform ${active ? 'text-[#ea580c] scale-105' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Gráfico de tendencia ascendente con puntos */}
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: (active: boolean) => (
        <svg
          className={`w-6 h-6 transition-transform ${active ? 'text-[#ea580c] scale-105' : 'text-slate-400'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 4 cuadrantes redondeados (Bento grid) */}
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center py-1 select-none active:scale-95 transition-transform group"
            >
              <div className="relative mb-0.5">
                {tab.icon(isActive)}
              </div>
              <span
                className={`text-[11px] font-semibold tracking-tight transition-colors ${
                  isActive ? 'text-[#ea580c] font-bold' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
