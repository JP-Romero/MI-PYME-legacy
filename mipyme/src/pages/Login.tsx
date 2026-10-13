/**
 * Pantalla de Acceso / Registro multi-inquilino.
 * Tras registrarse, el usuario crea su primer Negocio (tenant).
 */
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { createBusiness } from '../lib/api';

const INDUSTRIES = ['abarrotes', 'carniceria', 'ropa'] as const;

export default function Login() {
  const { user, signIn, signUp, businesses } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);

  // Paso 2: crear negocio si el usuario nuevo no tiene ninguno
  if (user && businesses.length === 0) return <CreateBusinessForm />;

  const submit = async () => {
    setErr(null);
    const e = mode === 'in' ? await signIn(email, pass) : await signUp(name, email, pass);
    if (e) setErr(e);
  };

  return (
    <main className="grid min-h-full place-items-center p-6">
      <div className="clay-card w-full max-w-sm p-6">
        <h1 className="mb-1 text-center text-3xl font-black dark:text-white">
          MI <span className="text-mint drop-shadow-[0_0_12px_rgba(0,245,212,0.8)]">PYME</span>
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

  const create = async () => {
    if (!user || !bizName.trim()) return;
    setSaving(true);
    await createBusiness(user.id, { name: bizName.trim(), industry });
    location.reload(); // recarga contexto con el nuevo tenant
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
        <button onClick={create} disabled={saving || !bizName.trim()} className="btn-mint w-full disabled:opacity-50">
          {saving ? 'Creando…' : 'Comenzar a vender'}
        </button>
      </div>
    </main>
  );
}
