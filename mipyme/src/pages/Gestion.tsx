/**
 * Pestaña GESTIÓN — Operaciones de caja, fiados (cuentas por cobrar),
 * tasa de cambio C$/USD, selección multitienda y ajustes.
 */
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import {
  getOpenRegister,
  openRegister,
  closeRegister,
  listCredits,
  payCredit,
  addCashMovement,
} from '../lib/api';
import type { CashRegister, CreditAccount } from '../lib/types';
import { fmtNio } from '../lib/currency';

interface GestionProps {
  dark: boolean;
  onToggleDark: () => void;
}

export default function Gestion({ dark, onToggleDark }: GestionProps) {
  const { business, businesses, user, switchBusiness, signOut } = useApp();
  const bizId = business?.id ?? 'demo';

  const [activeSection, setActiveSection] = useState<'caja' | 'fiados' | 'ajustes'>('caja');

  // Estado Caja Chica
  const [reg, setReg] = useState<CashRegister | null>(null);
  const [fund, setFund] = useState('');
  const [count, setCount] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');

  // Estado Fiados
  const [credits, setCredits] = useState<CreditAccount[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<{ [id: string]: string }>({});

  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = async () => {
    const [openReg, creditList] = await Promise.all([
      getOpenRegister(bizId),
      listCredits(bizId),
    ]);
    setReg(openReg);
    setCredits(creditList);
  };

  useEffect(() => {
    loadAll();
  }, [bizId]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };

  const handleOpenRegister = async () => {
    const f = parseFloat(fund || '0');
    const r = await openRegister(bizId, f);
    if (r) {
      setReg(r);
      setFund('');
      flash('Caja abierta exitosamente ✓');
    }
  };

  const handleCloseRegister = async () => {
    if (!reg) return;
    const physical = parseFloat(count || '0');
    await closeRegister(bizId, reg.id, physical, reg.opening_fund);
    setReg(null);
    setCount('');
    flash(`Caja cerrada · Conteo: ${fmtNio(physical)}`);
  };

  const handleAddMovement = async () => {
    const amt = parseFloat(movementAmount);
    if (!amt || amt <= 0) return;
    await addCashMovement(bizId, {
      register_id: reg?.id ?? null,
      type: movementType,
      amount_nio: amt,
      reason: movementReason || (movementType === 'in' ? 'Ingreso de efectivo' : 'Retiro de efectivo'),
    });
    setMovementAmount('');
    setMovementReason('');
    flash(movementType === 'in' ? 'Ingreso registrado ✓' : 'Egreso registrado ✓');
  };

  const handlePayCredit = async (c: CreditAccount) => {
    const val = parseFloat(paymentAmount[c.id] || '0');
    if (!val || val <= 0) return;
    await payCredit(bizId, c.id, c.paid_nio, val, c.amount_nio);
    setPaymentAmount((prev) => ({ ...prev, [c.id]: '' }));
    flash('Abono registrado ✓');
    loadAll();
  };

  const pendingCredits = credits.filter((c) => c.status !== 'paid');
  const totalFiado = pendingCredits.reduce((acc, c) => acc + (c.amount_nio - c.paid_nio), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#F59E0B] via-[#F59E0B] to-[#EA580C] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight uppercase">Gestión y Caja</h1>
          </div>
          <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full truncate max-w-[140px]">
            {business?.name || 'ANTRA POS'}
          </span>
        </div>
      </header>

      <div className="max-w-md mx-auto px-3.5 pt-3 space-y-3">
        {/* Selector de subsecciones estilo Píldoras */}
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSection('caja')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'caja' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            💰 Caja Chica
          </button>
          <button
            onClick={() => setActiveSection('fiados')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'fiados' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            🟡 Fiados ({pendingCredits.length})
          </button>
          <button
            onClick={() => setActiveSection('ajustes')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSection === 'ajustes' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ⚙️ Ajustes
          </button>
        </div>

        {/* ===== SECCIÓN 1: CAJA CHICA ===== */}
        {activeSection === 'caja' && (
          <div className="space-y-3">
            {!reg ? (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Caja Cerrada</h3>
                    <p className="text-xs text-slate-400">Ingresa el fondo inicial para comenzar el turno</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Fondo Inicial en Córdobas (C$)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Ej. 500"
                    value={fund}
                    onChange={(e) => setFund(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleOpenRegister}
                    disabled={!fund}
                    className="w-full bg-[#16a34a] hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs shadow-md active:scale-95 transition-all"
                  >
                    🔓 Abrir Turno de Caja
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">CAJA ABIERTA</span>
                    </div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                      {fmtNio(reg.opening_fund)}
                    </p>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                      Inició: {new Date(reg.opened_at).toLocaleTimeString('es-NI')}
                    </p>
                  </div>
                  <span className="text-3xl">💼</span>
                </div>

                {/* Movimientos de caja (Entradas/Salidas) */}
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Registrar Movimiento en Efectivo
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMovementType('in')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                        movementType === 'in' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      + Ingreso
                    </button>
                    <button
                      onClick={() => setMovementType('out')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                        movementType === 'out' ? 'bg-rose-100 text-rose-800 font-extrabold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      − Retiro / Gasto
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Monto C$"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      className="w-1/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                    <input
                      placeholder="Motivo (ej. cambio, pago proveedor)"
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                      className="w-2/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddMovement}
                    disabled={!movementAmount}
                    className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs active:scale-95 disabled:opacity-50"
                  >
                    Guardar Movimiento
                  </button>
                </div>

                {/* Arqueo y cierre */}
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    Arqueo y Cierre de Turno
                  </h4>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Conteo físico final en cajón C$"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    onClick={handleCloseRegister}
                    disabled={!count}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs shadow-md active:scale-95 transition-all"
                  >
                    🔒 Cerrar Caja con Arqueo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SECCIÓN 2: FIADOS / CUENTAS POR COBRAR ===== */}
        {activeSection === 'fiados' && (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Total por Cobrar</p>
                <p className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">{fmtNio(totalFiado)}</p>
                <p className="text-[10px] text-amber-600">{pendingCredits.length} cuentas pendientes</p>
              </div>
              <span className="text-3xl">📒</span>
            </div>

            <div className="space-y-2">
              {pendingCredits.map((c) => {
                const pending = c.amount_nio - c.paid_nio;
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 dark:text-white uppercase">{c.customer_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {c.customer_phone ? `📞 ${c.customer_phone} · ` : ''}Abonado: {fmtNio(c.paid_nio)} de {fmtNio(c.amount_nio)}
                        </p>
                      </div>
                      <span className="font-black text-sm text-[#EA580C]">{fmtNio(pending)}</span>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Monto de abono C$"
                        value={paymentAmount[c.id] || ''}
                        onChange={(e) => setPaymentAmount({ ...paymentAmount, [c.id]: e.target.value })}
                        className="w-2/3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      />
                      <button
                        onClick={() => handlePayCredit(c)}
                        className="w-1/3 bg-[#16a34a] text-white font-bold text-xs py-1.5 rounded-xl active:scale-95"
                      >
                        Abonar
                      </button>
                    </div>
                  </div>
                );
              })}

              {pendingCredits.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-4xl mb-2">🎉</p>
                  <p className="text-sm font-semibold">No hay fiados pendientes</p>
                  <p className="text-xs mt-1">Todas las cuentas están al día</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SECCIÓN 3: AJUSTES ===== */}
        {activeSection === 'ajustes' && (
          <div className="space-y-3">
            {/* Multitienda */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                Mis Tiendas / Sucursales
              </h4>
              <div className="space-y-2">
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => switchBusiness(b)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      b.id === business?.id
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold">🏪 {b.name}</p>
                      <p className="text-[10px] opacity-70">Giro: {b.industry}</p>
                    </div>
                    {b.id === business?.id && <span className="text-emerald-600 font-extrabold text-xs">✓ Activa</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Ajuste de Modo Oscuro / Claro */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-extrabold text-xs text-slate-900 dark:text-white">Tema Visual</p>
                <p className="text-[11px] text-slate-400">{dark ? 'Modo Oscuro activo' : 'Modo Claro activo'}</p>
              </div>
              <button
                onClick={onToggleDark}
                className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                {dark ? '☀️ Activar Claro' : '🌙 Activar Oscuro'}
              </button>
            </div>

            {/* Sesión y usuario */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div>
                <p className="font-extrabold text-xs text-slate-900 dark:text-white">Cuenta Activa</p>
                <p className="text-xs text-slate-500 font-medium">{user?.email || 'vendedor@antrapas.com'}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 font-bold py-2.5 rounded-xl text-xs border border-rose-200 dark:border-rose-900 active:scale-95"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
          {msg}
        </div>
      )}
    </div>
  );
}
