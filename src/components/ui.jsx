import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`glass-strong neon-border relative max-h-[90vh] w-full overflow-y-auto rounded-2xl p-5 sm:p-6 ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="glow-text text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return <div className="dial mx-auto h-8 w-8 animate-spin rounded-full opacity-80 blur-[1px]" />
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Avatar({ name, role, size = 'md' }) {
  const sizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  }
  const grad =
    role === 'treinamento'
      ? 'from-fuchsia-400 to-violet-500'
      : role === 'admin'
        ? 'from-amber-300 to-orange-500'
        : 'from-cyan-400 to-indigo-400'
  const firstName = (name || '?').split(' ')[0]
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-slate-950 ${sizes[size]} ${grad}`}
      title={name || 'Sem responsável'}
    >
      {firstName.charAt(0).toUpperCase()}
    </div>
  )
}