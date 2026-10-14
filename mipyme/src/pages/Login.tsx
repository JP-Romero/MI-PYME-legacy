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

  const signInWithGoogle = async () => {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
  };

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

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-secondary/30"></div></div>
          <span className="relative bg-white/10 dark:bg-[#1C3047] px-3 text-xs text-secondary uppercase font-semibold">o</span>
        </div>

        <button onClick={signInWithGoogle} disabled={loading} className="w-full mb-3 flex items-center justify-center gap-3 rounded-pill bg-white dark:bg-[#56738C] text-carbon dark:text-white px-5 py-3.5 font-bold shadow-clay hover:opacity-90 transition-opacity disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.95H1.2v3.15C3.16 21.31 7.23 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.6H1.2C.44 8.13 0 9.87 0 12s.44 3.87 1.2 5.4l4.08-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.16 2.69 1.2 6.6l4.08 3.15c.95-2.84 3.6-4.95 6.72-4.95z"/>
          </svg>
          Continuar con Google
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
