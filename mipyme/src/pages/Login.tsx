/**
 * Pantalla de Acceso / Registro multi-inquilino.
 * Tras registrarse, el usuario crea su primer Negocio (tenant).
 */
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { createBusiness } from '../lib/api';
import { supabase } from '../lib/supabase';

const INDUSTRIES = ['abarrotes', 'carniceria', 'ropa'] as const;

export default function Login() {
  const { user, signIn, signUp, businesses } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Paso 2: crear negocio si el usuario nuevo no tiene ninguno
  if (user && businesses.length === 0) return <CreateBusinessForm />;

  // Si registró pero email no confirmado, mostrar mensaje
  if (emailSent) {
    return (
      <main className="grid min-h-full place-items-center p-6">
        <div className="clay-card w-full max-w-sm p-6 text-center">
          <h2 className="mb-3 text-xl font-black dark:text-white">📬 Confirma tu correo</h2>
          <p className="mb-4 text-sm opacity-80 dark:text-white">Te enviamos un enlace a <b>{email}</b>. Abre tu correo y confirma para poder ingresar.</p>
          <button
            onClick={async () => {
              setLoading(true);
              const { error } = await supabase.auth.resend({ type: 'signup', email });
              setErr(error?.message ?? null);
              setLoading(false);
            }}
            disabled={loading}
            className="btn-mint w-full disabled:opacity-50"
          >
            {loading ? 'Reenviando…' : 'Reenviar correo'}
          </button>
          <button onClick={() => { setEmailSent(false); setMode('in'); }} className="btn-ghost w-full dark:text-white mt-3">Volver al ingreso</button>
        </div>
      </main>
    );
  }

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      if (mode === 'in') {
        const errMsg = await signIn(email, pass);
        if (errMsg) {
          if (errMsg.toLowerCase().includes('not confirmed')) {
            setErr('Tu correo aún no está confirmado. Revisa tu bandeja de entrada.');
          } else {
            setErr(errMsg);
          }
        }
      } else {
        const errMsg = await signUp(name, email, pass);
        if (errMsg) {
          if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already exists')) {
            setErr('Ya tienes una cuenta con este correo. Revisa tu bandeja para confirmar, o usa "Reenviar".');
          } else {
            setErr(errMsg);
          }
        } else {
          setEmailSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="clay-card w-full max-w-sm p-6">
        <h1 className="mb-1 text-center text-3xl font-black dark:text-white">
          MI <span className="text-mint drop-shadow-[0_0_12px_rgba(142,182,155,0.8)]">PYME</span>
        </h1>
        <p className="mb-6 text-center text-sm opacity-60 dark:text-white">Tu TPV gratis, multitienda y sin suscripciones.</p>

        {mode === 'up' && (
          <input className="clay-input mb-3" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input className="clay-input mb-3" type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="clay-input mb-4" type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />

        {err && <p className="mb-3 text-sm font-bold text-coral">{err}</p>}

        <button onClick={submit} className="btn-mint mb-3 w-full">
          {mode === 'in' ? 'Ingresar' : 'Crear cuenta'}
        </button>
        <button onClick={() => setMode(m => (m === 'in' ? 'up' : 'in'))} className="btn-ghost w-full dark:text-white">
          {mode === 'in' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
        </button>
      </div>
    </main>
  );
}

/** Formulario para crear el primer negocio (tenant) del usuario. */
function CreateBusinessForm() {
  const { user } = useApp();
  const [bizName, setBizName] = useState('');
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>('abarrotes');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (!user || !bizName.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await createBusiness(user.id, { name: bizName.trim(), industry });
      if (!res) {
        setErr('No se pudo crear el negocio. Revisa la consola o permisos de RLS.');
        setSaving(false);
        return;
      }
      location.reload(); // recarga contexto con el nuevo tenant
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? 'Error al crear el negocio');
      setSaving(false);
    }
  };

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="clay-card w-full max-w-sm p-6">
        <h2 className="mb-4 text-xl font-black dark:text-white">Crea tu tienda 🏪</h2>
        <input className="clay-input mb-3" placeholder="Nombre del negocio" value={bizName} onChange={e => setBizName(e.target.value)} />
        <div className="mb-5 flex gap-2">
          {INDUSTRIES.map(i => (
            <button key={i} onClick={() => setIndustry(i)}
              className={`chip capitalize ${industry === i ? 'bg-orchid text-white' : 'dark:text-white'}`}>
              {i === 'abarrotes' ? '🛍️' : i === 'carniceria' ? '🥩' : '👗'} {i}
            </button>
          ))}
        </div>
        {err && <p className="mb-3 text-sm font-bold text-coral">{err}</p>}
        <button onClick={create} disabled={saving || !bizName.trim()} className="btn-mint w-full disabled:opacity-50">
          {saving ? 'Creando…' : 'Comenzar a vender'}
        </button>
      </div>
    </main>
  );
}
