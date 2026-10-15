import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, BarChart3, Boxes, Building2, Check, ChevronRight,
  Eye, EyeOff, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, PackageOpen,
  Plus, RefreshCw, ShieldCheck, ShoppingBag, Store, UserRound, Wifi, WifiOff, X,
} from 'lucide-react'
import { Navigate, createBrowserRouter, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="MI PYME">
      <svg className={compact ? 'brand-mark brand-mark--small' : 'brand-mark'} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="19" fill="#143959" />
        <path d="M13 27.5 18.2 17h27.6L51 27.5H13Z" fill="#DFAD48" />
        <path d="M16 29h32v20a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V29Z" fill="#F6FBFF" />
        <path d="M24 53V37l8 8 8-8v16" fill="none" stroke="#143959" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5" />
      </svg>
      <div><div className="brand-name">MI PYME</div>{!compact && <div className="brand-tagline">Ventas multinegocio</div>}</div>
    </div>
  )
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="ambient ambient--one" /><div className="ambient ambient--two" />
      <section className="auth-story">
        <Logo />
        <div className="story-copy">
          <p className="eyebrow">Tu negocio, siempre contigo</p>
          <h1>Vende con claridad.<br />Crece con control.</h1>
          <p>Administra tus negocios desde una sola aplicación, incluso cuando la conexión se interrumpe.</p>
        </div>
        <div className="feature-row">
          <span><Wifi size={18} /> Offline first</span>
          <span><ShieldCheck size={18} /> Datos protegidos</span>
        </div>
      </section>
      <section className="auth-area">
        <div className="auth-mobile-logo"><Logo compact /></div>
        {children}
        <p className="auth-footer">© {new Date().getFullYear()} MI PYME · Hecho para crecer contigo</p>
      </section>
    </main>
  )
}

const authContent = {
  login: ['Bienvenido de nuevo', 'Ingresa a tu cuenta', 'Tus ventas y negocios te están esperando.'],
  register: ['Comienza hoy', 'Crea tu cuenta', 'Centraliza la operación de todos tus negocios.'],
  forgot: ['Recupera tu acceso', '¿Olvidaste tu clave?', 'Te enviaremos un enlace seguro para crear una nueva.'],
  reset: ['Protege tu cuenta', 'Crea una nueva clave', 'Elige una contraseña segura que puedas recordar.'],
} satisfies Record<AuthMode, [string, string, string]>

function AuthPage({ mode }: { mode: AuthMode }) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [eyebrow, title, description] = authContent[mode]

  if (!authLoading && user && mode === 'login') return <Navigate to="/app" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(''); setMessage('')
    if (!supabase) return setError('La conexión con Supabase aún no está configurada.')
    if ((mode === 'register' || mode === 'reset') && password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if ((mode === 'register' || mode === 'reset') && password !== confirmation) return setError('Las contraseñas no coinciden.')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        navigate('/app')
      } else if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (authError) throw authError
        if (data.session) navigate('/app')
        else setMessage(`Enviamos un enlace de verificación a ${email}. Revísalo para activar tu cuenta.`)
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/restablecer` })
        if (authError) throw authError
        setMessage(`Te enviamos las instrucciones a ${email}.`)
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        setMessage('Tu contraseña fue actualizada correctamente.')
        window.setTimeout(() => navigate('/app'), 1200)
      }
    } catch (caught) {
      setError(translateAuthError(caught instanceof Error ? caught.message : 'No pudimos completar la solicitud.'))
    } finally { setLoading(false) }
  }

  async function continueWithGoogle() {
    setError('')
    if (!supabase) return setError('La conexión con Supabase aún no está configurada.')
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) setError(translateAuthError(authError.message))
  }

  return (
    <AuthShell>
      <div className="auth-card">
        {(mode === 'forgot' || mode === 'reset') && <button className="back-link" type="button" onClick={() => navigate('/')}><ArrowLeft size={17} /> Volver al inicio</button>}
        <div className="auth-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
        {message ? (
          <div className="success-state" role="status">
            <span><Check size={24} /></span><h3>Solicitud completada</h3><p>{message}</p>
            {mode !== 'reset' && <button className="secondary-button" type="button" onClick={() => navigate('/')}>Volver a iniciar sesión</button>}
          </div>
        ) : (
          <>
            {(mode === 'login' || mode === 'register') && <>
              <button className="google-button" type="button" onClick={continueWithGoogle}><GoogleIcon /> Continuar con Google</button>
              <div className="divider"><span>o usa tu correo</span></div>
            </>}
            <form onSubmit={submit}>
              {mode !== 'reset' && <Field label="Correo electrónico" icon={<Mail size={19} />}><input type="email" autoComplete="email" placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>}
              {mode !== 'forgot' && <Field label="Contraseña" icon={<LockKeyhole size={19} />}>
                <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Ingresa tu contraseña' : 'Mínimo 8 caracteres'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </Field>}
              {(mode === 'register' || mode === 'reset') && <Field label="Confirmar contraseña" icon={<ShieldCheck size={19} />}><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Repite tu contraseña" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></Field>}
              {mode === 'login' && <button className="forgot-link" type="button" onClick={() => navigate('/recuperar')}>¿Olvidaste tu contraseña?</button>}
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="primary-button" type="submit" disabled={loading}>
                {loading && <RefreshCw className="spin" size={19} />}
                {mode === 'login' ? 'Ingresar a MI PYME' : mode === 'register' ? 'Crear mi cuenta' : mode === 'forgot' ? 'Enviar enlace de recuperación' : 'Guardar nueva contraseña'}
                {!loading && <ArrowRight size={19} />}
              </button>
            </form>
            {mode === 'login' && <p className="switch-auth">¿Aún no tienes cuenta? <button onClick={() => navigate('/registro')}>Créala gratis</button></p>}
            {mode === 'register' && <p className="switch-auth">¿Ya tienes una cuenta? <button onClick={() => navigate('/')}>Inicia sesión</button></p>}
          </>
        )}
      </div>
    </AuthShell>
  )
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{icon}{children}</div></label>
}

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h6a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.2-4.8 3.2-8.2Z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.6l-3.6-2.8c-1 .7-2.3 1-3.8 1a6.5 6.5 0 0 1-6.1-4.4H2.2V17A11.2 11.2 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.9 14.2a6.7 6.7 0 0 1 0-4.3V7.1H2.2a11.1 11.1 0 0 0 0 9.9l3.7-2.8Z" />
    <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.3 1.7L19.5 4A10.8 10.8 0 0 0 2.2 7.1l3.7 2.8A6.5 6.5 0 0 1 12 5.4Z" />
  </svg>
}

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  useEffect(() => {
    async function finish() {
      if (!supabase) return setError('Supabase no está configurado.')
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) return setError(translateAuthError(exchangeError.message))
      }
      navigate('/app', { replace: true })
    }
    void finish()
  }, [navigate])
  return <AuthShell><div className="auth-card callback-card">{error ? <div className="error-message">{error}</div> : <><RefreshCw className="spin" /><h2>Protegiendo tu sesión</h2><p>Estamos preparando tu espacio de trabajo.</p></>}</div></AuthShell>
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loader"><Logo /><RefreshCw className="spin" /></div>
  return user ? children : <Navigate to="/" replace />
}

function Dashboard() {
  const { user, signOut } = useAuth()
  const [online, setOnline] = useState(navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Emprendedor'

  return (
    <main className="dashboard-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="sidebar-top"><Logo compact /><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X /></button></div>
        <nav>
          <button className="nav-item nav-item--active"><LayoutDashboard size={20} /> Resumen</button>
          <button className="nav-item"><ShoppingBag size={20} /> Ventas</button>
          <button className="nav-item"><Boxes size={20} /> Productos</button>
          <button className="nav-item"><Building2 size={20} /> Mis negocios</button>
          <button className="nav-item"><BarChart3 size={20} /> Reportes</button>
        </nav>
        <div className="sidebar-profile">
          <div className="avatar"><UserRound size={20} /></div>
          <div><strong>{firstName}</strong><small>{user?.email}</small></div>
          <button onClick={() => void signOut()} aria-label="Cerrar sesión"><LogOut size={19} /></button>
        </div>
      </aside>
      {menuOpen && <button className="menu-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <section className="dashboard-main">
        <header className="dashboard-header">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div><p className="eyebrow">Panel principal</p><h1>Hola, {firstName}</h1></div>
          <div className={online ? 'network-pill network-pill--online' : 'network-pill'}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Conectado' : 'Modo offline'}</div>
        </header>
        <section className="welcome-banner">
          <div><span className="mini-label">PRIMER PASO</span><h2>Prepara tu espacio de ventas</h2><p>Crea tu primer negocio para comenzar a registrar productos, clientes y ventas.</p><button><Plus size={18} /> Crear mi primer negocio</button></div>
          <div className="floating-store" aria-hidden="true"><div className="store-roof" /><div className="store-body"><Store size={52} /></div><span className="float-chip float-chip--one"><Check size={16} /></span><span className="float-chip float-chip--two"><BarChart3 size={16} /></span></div>
        </section>
        <section className="dashboard-grid">
          <EmptyCard eyebrow="Tus espacios" title="Mis negocios" icon={<Building2 size={27} />} emptyTitle="Aún no tienes negocios" copy="Cuando crees uno, aparecerá aquí." action />
          <EmptyCard eyebrow="En tiempo real" title="Actividad reciente" icon={<PackageOpen size={27} />} emptyTitle="Todo listo para comenzar" copy="Tus ventas y movimientos se mostrarán aquí." />
        </section>
      </section>
    </main>
  )
}

function EmptyCard({ eyebrow, title, icon, emptyTitle, copy, action = false }: { eyebrow: string; title: string; icon: ReactNode; emptyTitle: string; copy: string; action?: boolean }) {
  return <article className="dashboard-card"><div className="card-title"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>{action && <button>Ver todos <ChevronRight size={17} /></button>}</div><div className="empty-state"><span>{icon}</span><h4>{emptyTitle}</h4><p>{copy}</p></div></article>
}

function translateAuthError(message: string) {
  const value = message.toLowerCase()
  if (value.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (value.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  if (value.includes('user already registered')) return 'Este correo ya tiene una cuenta.'
  if (value.includes('rate limit')) return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  return message
}

export const router = createBrowserRouter([
  { path: '/', element: <AuthPage mode="login" /> },
  { path: '/registro', element: <AuthPage mode="register" /> },
  { path: '/recuperar', element: <AuthPage mode="forgot" /> },
  { path: '/restablecer', element: <AuthPage mode="reset" /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/app', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: '*', element: <Navigate to="/" replace /> },
])
