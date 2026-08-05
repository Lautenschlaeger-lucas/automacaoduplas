import { useState } from 'react'
import { Zap, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          {...props}
          className="field pl-10"
        />
      </div>
    </label>
  )
}

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, name)
        setCreated(true)
      }
    } catch (err) {
      setError(err.message?.replace(/^Error:\s*/i, '') || 'Erro ao acessar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-space flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="dial flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg">
            <Zap size={28} strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-wide text-slate-800">PAINEL DE IMPLANTAÇÃO</h1>
            <p className="text-xs text-slate-400">Técnica & Treinamento em um só lugar</p>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          {created ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Zap size={22} />
              </div>
              <h2 className="font-bold text-slate-800">Conta criada!</h2>
              <p className="mt-1 text-sm text-slate-500">
                Confirme o e-mail de verificação enviado para <b className="text-slate-700">{email}</b> e depois faça login.
              </p>
              <button
                onClick={() => {
                  setCreated(false)
                  setMode('login')
                }}
                className="btn-ghost mt-4 w-full"
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {[
                  { key: 'login', label: 'Entrar' },
                  { key: 'cadastro', label: 'Criar conta' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setMode(t.key)
                      setError('')
                    }}
                    className={`rounded-lg py-2 text-sm font-semibold transition ${
                      mode === t.key
                        ? 'dial shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === 'cadastro' && (
                  <Field
                    label="Nome"
                    icon={UserIcon}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                  />
                )}
                <Field
                  label="E-mail"
                  icon={Mail}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                />
                <Field
                  label="Senha"
                  icon={Lock}
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} className="btn-primary mt-1 w-full">
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Projeto interno · Painel de Implantação
        </p>
      </div>
    </div>
  )
}